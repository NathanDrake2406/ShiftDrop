namespace ShiftDrop.Domain;

public class Casual
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public PhoneNumber PhoneNumber { get; private set; }
    public Guid PoolId { get; private set; }
    public Pool Pool { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }

    // Auth fields - null until casual accepts their invite
    public string? Auth0Id { get; private set; }
    public string? InviteToken { get; private set; }
    public DateTime? InviteExpiresAt { get; private set; }
    public InviteStatus InviteStatus { get; private set; }

    // Opt-out fields
    public DateTime? OptedOutAt { get; private set; }
    public string? OptOutToken { get; private set; }

    // Soft-delete field - set when manager removes casual from pool
    public DateTime? RemovedAt { get; private set; }

    /// <summary>
    /// True if the casual has been soft-deleted (removed by manager).
    /// Removed casuals are excluded from pool lists but their claim history is preserved.
    /// </summary>
    public bool IsRemoved => RemovedAt != null;

    /// <summary>
    /// A casual is active if they've accepted their invite, haven't opted out, and haven't been removed.
    /// Only active casuals receive shift notifications.
    /// </summary>
    public bool IsActive => InviteStatus == InviteStatus.Accepted && OptedOutAt == null && RemovedAt == null;

    private readonly List<ShiftClaim> _claims = new();
    public IReadOnlyCollection<ShiftClaim> Claims => _claims.AsReadOnly();

    private readonly List<CasualAvailability> _availability = new();
    public IReadOnlyCollection<CasualAvailability> Availability => _availability.AsReadOnly();

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

        var phoneResult = PhoneNumber.Parse(phoneNumber);
        if (phoneResult.IsFailure)
            return Result<Casual>.Failure(phoneResult.Error!);

        var casual = new Casual
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            PhoneNumber = phoneResult.Value,
            Pool = pool,
            PoolId = pool.Id,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
            // Generate invite token and set expiry (1 day)
            InviteToken = Guid.NewGuid().ToString("N"),
            InviteExpiresAt = timeProvider.GetUtcNow().UtcDateTime.AddDays(1),
            InviteStatus = InviteStatus.Pending,
            // Generate opt-out token for SMS unsubscribe links
            OptOutToken = Guid.NewGuid().ToString("N"),
        };

        return Result<Casual>.Success(casual);
    }

    /// <summary>
    /// Called when a casual clicks their invite link to verify their phone number.
    /// This is phone-only verification - no Auth0 required.
    /// </summary>
    public Result<Casual> AcceptInvite(string inviteToken, TimeProvider timeProvider)
    {
        if (InviteStatus == InviteStatus.Accepted)
            return Result<Casual>.Failure("Invite has already been accepted");

        if (InviteToken != inviteToken)
            return Result<Casual>.Failure("Invalid invite token");

        if (InviteExpiresAt.HasValue && timeProvider.GetUtcNow().UtcDateTime > InviteExpiresAt.Value)
            return Result<Casual>.Failure("Invite has expired");

        InviteStatus = InviteStatus.Accepted;
        InviteToken = null; // Clear token after use
        InviteExpiresAt = null;

        return Result<Casual>.Success(this);
    }

    /// <summary>
    /// Legacy overload for Auth0-based acceptance. Links Auth0 account to casual.
    /// </summary>
    public Result<Casual> AcceptInvite(
        string inviteToken,
        string auth0Id,
        TimeProvider timeProvider
    )
    {
        var result = AcceptInvite(inviteToken, timeProvider);
        if (result.IsFailure)
            return result;

        Auth0Id = auth0Id;
        return Result<Casual>.Success(this);
    }

    /// <summary>
    /// Regenerates the invite token for resending invites.
    /// Only valid for casuals who haven't yet accepted.
    /// </summary>
    public Result<Casual> RegenerateInviteToken(TimeProvider timeProvider)
    {
        if (InviteStatus == InviteStatus.Accepted)
            return Result<Casual>.Failure("Cannot resend invite to a casual who has already accepted");

        InviteToken = Guid.NewGuid().ToString("N");
        InviteExpiresAt = timeProvider.GetUtcNow().UtcDateTime.AddDays(1);

        return Result<Casual>.Success(this);
    }

    /// <summary>
    /// Opts the casual out of SMS notifications. They will no longer receive shift broadcasts.
    /// </summary>
    public Result<Casual> OptOut(string optOutToken, TimeProvider timeProvider)
    {
        if (OptOutToken != optOutToken)
            return Result<Casual>.Failure("Invalid opt-out token");

        if (OptedOutAt.HasValue)
            return Result<Casual>.Failure("Already opted out");

        OptedOutAt = timeProvider.GetUtcNow().UtcDateTime;
        OptOutToken = null; // Clear token after use

        return Result<Casual>.Success(this);
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

    /// <summary>
    /// Checks if the casual is available for a shift at the given time.
    /// Returns true if: no availability set (default = available anytime) OR
    /// shift fits entirely within availability window for that day.
    /// Supports overnight availability (e.g., 22:00-06:00 for nightfill).
    /// </summary>
    public bool IsAvailableFor(DateTime shiftStart, DateTime shiftEnd)
    {
        // No availability records = available anytime (backwards compatible)
        if (!_availability.Any())
            return true;

        var dayAvailability = _availability.FirstOrDefault(a => a.DayOfWeek == shiftStart.DayOfWeek);
        if (dayAvailability == null)
            return false;

        var shiftStartTime = TimeOnly.FromDateTime(shiftStart);
        var shiftEndTime = TimeOnly.FromDateTime(shiftEnd);

        // Both start and end must fall within the availability window
        return dayAvailability.ContainsTime(shiftStartTime)
            && dayAvailability.ContainsTime(shiftEndTime);
    }

    /// <summary>
    /// Replaces all availability records with the provided list.
    /// Called from the endpoint after validating each slot.
    /// </summary>
    public void SetAvailability(IEnumerable<CasualAvailability> availability)
    {
        _availability.Clear();
        _availability.AddRange(availability);
    }

    /// <summary>
    /// Soft-deletes the casual. They will be excluded from pool lists
    /// but their claim history is preserved for audit purposes.
    /// Idempotent — calling multiple times preserves the original removal timestamp.
    /// </summary>
    public void MarkAsRemoved(TimeProvider timeProvider)
    {
        RemovedAt ??= timeProvider.GetUtcNow().UtcDateTime;
    }
}

public enum InviteStatus
{
    Pending,
    Accepted,
}
