namespace ShiftDrop.Domain;

/// <summary>
/// A 2IC (Second in Command) admin for a pool. Pool admins have equal access
/// to manage shifts and casuals as the pool owner.
/// </summary>
public class PoolAdmin
{
    public Guid Id { get; private set; }
    public Guid PoolId { get; private set; }
    public Pool Pool { get; private set; } = null!;
    public string PhoneNumber { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;

    // Auth fields - null until admin accepts their invite
    public string? Auth0Id { get; private set; }

    // Invite fields - token is nullable and cleared after acceptance
    public string? InviteToken { get; private set; }
    public DateTime InvitedAt { get; private set; }
    public DateTime? AcceptedAt { get; private set; }
    public DateTime InviteExpiresAt { get; private set; }

    /// <summary>
    /// True when the admin has accepted their invite and linked their Auth0 account.
    /// </summary>
    public bool IsAccepted => AcceptedAt.HasValue;

    /// <summary>
    /// True when the invite has expired without being accepted.
    /// </summary>
    public bool IsExpired(TimeProvider timeProvider) =>
        !IsAccepted && timeProvider.GetUtcNow().UtcDateTime > InviteExpiresAt;

    private PoolAdmin() { }

    internal static Result<PoolAdmin> Create(
        string phoneNumber,
        string name,
        Pool pool,
        TimeProvider timeProvider)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return Result<PoolAdmin>.Failure("Phone number is required for SMS invites");

        if (string.IsNullOrWhiteSpace(name))
            return Result<PoolAdmin>.Failure("Name cannot be empty");

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var normalizedPhone = NormalizePhoneNumber(phoneNumber.Trim());

        var poolAdmin = new PoolAdmin
        {
            Id = Guid.NewGuid(),
            PoolId = pool.Id,
            Pool = pool,
            PhoneNumber = normalizedPhone,
            Name = name.Trim(),
            InviteToken = Guid.NewGuid().ToString("N"),
            InvitedAt = now,
            InviteExpiresAt = now.AddDays(7)
        };

        return Result<PoolAdmin>.Success(poolAdmin);
    }

    /// <summary>
    /// Called when an invited admin clicks their invite link and authenticates.
    /// Links their Auth0 account to this pool admin record.
    /// </summary>
    public Result<PoolAdmin> AcceptInvite(string auth0Id, TimeProvider timeProvider)
    {
        if (IsAccepted)
            return Result<PoolAdmin>.Failure("Invite has already been accepted");

        if (IsExpired(timeProvider))
            return Result<PoolAdmin>.Failure("Invite has expired");

        if (string.IsNullOrWhiteSpace(auth0Id))
            return Result<PoolAdmin>.Failure("Auth0 ID is required");

        Auth0Id = auth0Id;
        AcceptedAt = timeProvider.GetUtcNow().UtcDateTime;
        InviteToken = null; // Clear token after use for security

        return Result<PoolAdmin>.Success(this);
    }

    /// <summary>
    /// Regenerates the invite token for a pending (not yet accepted) admin.
    /// Useful when the original invite expired.
    /// </summary>
    public Result<PoolAdmin> RegenerateInviteToken(TimeProvider timeProvider)
    {
        if (IsAccepted)
            return Result<PoolAdmin>.Failure("Cannot regenerate token for an accepted invite");

        InviteToken = Guid.NewGuid().ToString("N");
        InviteExpiresAt = timeProvider.GetUtcNow().UtcDateTime.AddDays(7);

        return Result<PoolAdmin>.Success(this);
    }

    /// <summary>
    /// Normalizes phone numbers to E.164 format for SMS delivery.
    /// Handles Australian numbers: 0412345678 → +61412345678
    /// </summary>
    private static string NormalizePhoneNumber(string phone)
    {
        var digits = new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());

        if (digits.StartsWith('+'))
            return digits;

        if (digits.StartsWith("04") && digits.Length == 10)
            return "+61" + digits[1..];

        if (digits.StartsWith("61") && digits.Length == 11)
            return "+" + digits;

        return "+" + digits;
    }
}
