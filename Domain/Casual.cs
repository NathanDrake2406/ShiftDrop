namespace ShiftDrop.Domain;

public class Casual
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string PhoneNumber { get; private set; } = string.Empty;
    public Guid PoolId { get; private set; }
    public Pool Pool { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }

    // Auth fields - null until casual accepts their invite
    public string? Auth0Id { get; private set; }
    public string? InviteToken { get; private set; }
    public DateTime? InviteExpiresAt { get; private set; }
    public InviteStatus InviteStatus { get; private set; }

    private readonly List<ShiftClaim> _claims = new();
    public IReadOnlyCollection<ShiftClaim> Claims => _claims.AsReadOnly();

    private Casual() { }

    internal static Result<Casual> Create(
        string name,
        string phoneNumber,
        Pool pool,
        TimeProvider timeProvider
    )
    {
        if (string.IsNullOrWhiteSpace(name))
            return Result<Casual>.Failure("Casual name cannot be empty");

        if (string.IsNullOrWhiteSpace(phoneNumber))
            return Result<Casual>.Failure("Phone number is required for SMS notifications");

        var casual = new Casual
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            PhoneNumber = phoneNumber.Trim(),
            Pool = pool,
            PoolId = pool.Id,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
            // Generate invite token and set expiry (7 days)
            InviteToken = Guid.NewGuid().ToString("N"),
            InviteExpiresAt = timeProvider.GetUtcNow().UtcDateTime.AddDays(7),
            InviteStatus = InviteStatus.Pending,
        };

        return Result<Casual>.Success(casual);
    }

    /// <summary>
    /// Called when a casual clicks their invite link and logs in via Auth0.
    /// Links their Auth0 account to this casual record.
    /// </summary>
    public Result<Casual> AcceptInvite(
        string inviteToken,
        string auth0Id,
        TimeProvider timeProvider
    )
    {
        // TODO(human): Implement the invite acceptance logic
        //
        // You need to check 3 things before accepting:
        // 1. Is the invite token correct? (compare with this.InviteToken)
        // 2. Has the invite expired? (compare InviteExpiresAt with current time)
        // 3. Was this invite already accepted? (check InviteStatus)
        //
        // If all checks pass:
        // - Set Auth0Id to the provided auth0Id
        // - Set InviteStatus to Accepted
        // - Clear the InviteToken (set to null)
        // - Return Result<Casual>.Success(this)
        //
        // If any check fails, return Result<Casual>.Failure("appropriate message")

        throw new NotImplementedException("Your turn! Check the TODO above.");
    }

    public Result<ShiftClaim> ClaimShift(Shift shift, TimeProvider timeProvider)
    {
        if (shift.PoolId != PoolId)
            return Result<ShiftClaim>.Failure("Cannot claim a shift from a different pool");

        var existingClaim = _claims.FirstOrDefault(c =>
            c.ShiftId == shift.Id && c.Status == ClaimStatus.Claimed
        );
        if (existingClaim != null)
            return Result<ShiftClaim>.Failure("You have already claimed this shift");

        var claimResult = shift.AcceptClaim(this, timeProvider);
        if (claimResult.IsFailure)
            return claimResult;

        _claims.Add(claimResult.Value!);
        return claimResult;
    }

    public Result<ShiftClaim> ReleaseShift(Shift shift, TimeProvider timeProvider)
    {
        var claim = _claims.FirstOrDefault(c =>
            c.ShiftId == shift.Id && c.Status == ClaimStatus.Claimed
        );
        if (claim == null)
            return Result<ShiftClaim>.Failure("No active claim found for this shift");

        claim.MarkAsBailed(timeProvider);
        shift.ReleaseClaim();

        return Result<ShiftClaim>.Success(claim);
    }
}

public enum InviteStatus
{
    Pending,
    Accepted,
}
