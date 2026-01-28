using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ShiftDrop.Domain;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Pool> Pools => Set<Pool>();
    public DbSet<Casual> Casuals => Set<Casual>();
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<ShiftClaim> ShiftClaims => Set<ShiftClaim>();
    public DbSet<ShiftNotification> ShiftNotifications => Set<ShiftNotification>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<PoolAdmin> PoolAdmins => Set<PoolAdmin>();
    public DbSet<CasualAvailability> CasualAvailability => Set<CasualAvailability>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Pool>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).ValueGeneratedNever(); // Domain generates IDs
            entity.Property(p => p.Name).HasMaxLength(200).IsRequired();
            entity.Property(p => p.ManagerAuth0Id).HasMaxLength(200).IsRequired();
            entity.HasIndex(p => p.ManagerAuth0Id);

            // Use backing field for proper change tracking with IReadOnlyCollection
            entity.Navigation(p => p.Casuals).UsePropertyAccessMode(PropertyAccessMode.Field);
            entity.HasMany(p => p.Casuals)
                .WithOne(c => c.Pool)
                .HasForeignKey(c => c.PoolId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Navigation(p => p.Shifts).UsePropertyAccessMode(PropertyAccessMode.Field);
            entity.HasMany(p => p.Shifts)
                .WithOne(s => s.Pool)
                .HasForeignKey(s => s.PoolId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Navigation(p => p.Admins).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<Casual>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).ValueGeneratedNever(); // Domain generates IDs
            entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
            entity.Property(c => c.PhoneNumber)
                .HasMaxLength(50)
                .IsRequired()
                .HasConversion(
                    phone => phone.Value,
                    value => PhoneNumber.FromTrusted(value));
            entity.HasIndex(c => new { c.PoolId, c.PhoneNumber }).IsUnique();

            // Token fields for SMS-based verification
            entity.Property(c => c.InviteToken).HasMaxLength(32);
            entity.Property(c => c.InviteStatus).HasConversion<string>().HasMaxLength(20);
            entity.Property(c => c.OptOutToken).HasMaxLength(32);

            // Filtered indexes for token lookups (only index non-null tokens)
            entity.HasIndex(c => c.InviteToken)
                .HasFilter("[InviteToken] IS NOT NULL")
                .IsUnique();
            entity.HasIndex(c => c.OptOutToken)
                .HasFilter("[OptOutToken] IS NOT NULL")
                .IsUnique();

            // Use backing field for proper change tracking with IReadOnlyCollection
            entity.Navigation(c => c.Claims).UsePropertyAccessMode(PropertyAccessMode.Field);
            entity.HasMany(c => c.Claims)
                .WithOne(sc => sc.Casual)
                .HasForeignKey(sc => sc.CasualId)
                // NoAction to avoid multiple cascade paths (SQL Server restriction)
                // Claims are deleted via Shift cascade when Pool is deleted
                .OnDelete(DeleteBehavior.NoAction);

            entity.Navigation(c => c.Availability).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).ValueGeneratedNever(); // Domain generates IDs
            entity.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);

            // Concurrency token to handle race conditions on claim
            entity.Property(s => s.SpotsRemaining).IsConcurrencyToken();

            entity.HasIndex(s => new { s.PoolId, s.Status, s.StartsAt });

            // Use backing field for proper change tracking with IReadOnlyCollection
            entity.Navigation(s => s.Claims).UsePropertyAccessMode(PropertyAccessMode.Field);
            entity.HasMany(s => s.Claims)
                .WithOne(sc => sc.Shift)
                .HasForeignKey(sc => sc.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShiftClaim>(entity =>
        {
            entity.HasKey(sc => sc.Id);
            // Domain generates IDs, not the database - critical for proper INSERT vs UPDATE
            entity.Property(sc => sc.Id).ValueGeneratedNever();
            entity.Property(sc => sc.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(sc => new { sc.ShiftId, sc.CasualId, sc.Status });
        });

        modelBuilder.Entity<ShiftNotification>(entity =>
        {
            entity.HasKey(sn => sn.Id);
            entity.Property(sn => sn.Id).ValueGeneratedNever(); // Domain generates IDs

            entity.Property(sn => sn.ClaimToken).HasMaxLength(32).IsRequired();
            entity.Property(sn => sn.TokenStatus).HasConversion<string>().HasMaxLength(20);

            // Unique index on claim token for fast lookups
            entity.HasIndex(sn => sn.ClaimToken).IsUnique();

            // Index for finding pending notifications by shift (for revocation)
            entity.HasIndex(sn => new { sn.ShiftId, sn.TokenStatus });

            // Relationships
            entity.HasOne(sn => sn.Shift)
                .WithMany()
                .HasForeignKey(sn => sn.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(sn => sn.Casual)
                .WithMany()
                .HasForeignKey(sn => sn.CasualId)
                // NoAction to avoid multiple cascade paths (SQL Server restriction)
                // Notifications are deleted via Shift cascade when Pool is deleted
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.HasKey(om => om.Id);
            entity.Property(om => om.Id).ValueGeneratedNever(); // Domain generates IDs

            entity.Property(om => om.MessageType).HasMaxLength(100).IsRequired();
            entity.Property(om => om.Payload).IsRequired(); // JSON text, no max length
            entity.Property(om => om.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(om => om.LastError).HasMaxLength(1000);

            // Index for outbox processor to find pending messages ready for processing
            entity.HasIndex(om => new { om.Status, om.NextRetryAt })
                .HasFilter("[Status] = 'Pending'");
        });

        modelBuilder.Entity<PoolAdmin>(entity =>
        {
            entity.HasKey(pa => pa.Id);
            entity.Property(pa => pa.Id).ValueGeneratedNever(); // Domain generates IDs

            entity.Property(pa => pa.PhoneNumber)
                .HasMaxLength(50)
                .IsRequired()
                .HasConversion(
                    phone => phone.Value,
                    value => PhoneNumber.FromTrusted(value));
            entity.Property(pa => pa.Name).HasMaxLength(200).IsRequired();
            entity.Property(pa => pa.Auth0Id).HasMaxLength(200);
            entity.Property(pa => pa.InviteToken).HasMaxLength(32);

            // Unique index on pool + phone number (one admin per phone per pool)
            entity.HasIndex(pa => new { pa.PoolId, pa.PhoneNumber }).IsUnique();

            // Index for token lookup (for accepting invites)
            entity.HasIndex(pa => pa.InviteToken)
                .IsUnique()
                .HasFilter("[InviteToken] IS NOT NULL");

            // Index for Auth0Id lookup (to find pools user is admin of)
            entity.HasIndex(pa => pa.Auth0Id)
                .HasFilter("[Auth0Id] IS NOT NULL");

            entity.HasOne(pa => pa.Pool)
                .WithMany(p => p.Admins)
                .HasForeignKey(pa => pa.PoolId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CasualAvailability>(entity =>
        {
            entity.HasKey(ca => ca.Id);
            entity.Property(ca => ca.Id).ValueGeneratedNever(); // Domain generates IDs

            entity.Property(ca => ca.DayOfWeek).HasConversion<int>();

            // Unique constraint: one entry per casual per day
            entity.HasIndex(ca => new { ca.CasualId, ca.DayOfWeek }).IsUnique();

            entity.HasOne(ca => ca.Casual)
                .WithMany(c => c.Availability)
                .HasForeignKey(ca => ca.CasualId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PushSubscription>(entity =>
        {
            entity.HasKey(ps => ps.Id);
            entity.Property(ps => ps.Id).ValueGeneratedNever(); // Domain generates IDs
            entity.Property(ps => ps.Endpoint).IsRequired().HasMaxLength(2048);
            entity.Property(ps => ps.P256dh).IsRequired().HasMaxLength(512);
            entity.Property(ps => ps.Auth).IsRequired().HasMaxLength(256);

            entity.HasOne(ps => ps.Casual)
                .WithMany()
                .HasForeignKey(ps => ps.CasualId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(ps => new { ps.CasualId, ps.Endpoint }).IsUnique();
        });
    }
}
