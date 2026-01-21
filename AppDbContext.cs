using Microsoft.EntityFrameworkCore;
using ShiftDrop.Domain;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Pool> Pools => Set<Pool>();
    public DbSet<Casual> Casuals => Set<Casual>();
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<ShiftClaim> ShiftClaims => Set<ShiftClaim>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Pool>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).HasMaxLength(200).IsRequired();
            entity.Property(p => p.ManagerAuth0Id).HasMaxLength(200).IsRequired();
            entity.HasIndex(p => p.ManagerAuth0Id);
            
            entity.HasMany(p => p.Casuals)
                .WithOne(c => c.Pool)
                .HasForeignKey(c => c.PoolId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasMany(p => p.Shifts)
                .WithOne(s => s.Pool)
                .HasForeignKey(s => s.PoolId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Casual>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
            entity.Property(c => c.PhoneNumber).HasMaxLength(50).IsRequired();
            entity.HasIndex(c => new { c.PoolId, c.PhoneNumber }).IsUnique();
            
            entity.HasMany(c => c.Claims)
                .WithOne(sc => sc.Casual)
                .HasForeignKey(sc => sc.CasualId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Shift>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
            
            // Concurrency token to handle race conditions on claim
            entity.Property(s => s.SpotsRemaining).IsConcurrencyToken();
            
            entity.HasIndex(s => new { s.PoolId, s.Status, s.StartsAt });
            
            entity.HasMany(s => s.Claims)
                .WithOne(sc => sc.Shift)
                .HasForeignKey(sc => sc.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShiftClaim>(entity =>
        {
            entity.HasKey(sc => sc.Id);
            entity.Property(sc => sc.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(sc => new { sc.ShiftId, sc.CasualId, sc.Status });
        });
    }
}
