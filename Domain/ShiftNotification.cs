namespace ShiftDrop.Domain;

/// <summary>
/// Tracks per-casual claim tokens for shift notifications.
/// Each active casual gets a unique token when a shift is posted.
/// </summary>
public class ShiftNotification
{
    public Guid Id { get; private set; }
    public Guid ShiftId { get; private set; }
    public Shift Shift { get; private set; } = null!;
    public Guid CasualId { get; private set; }
    public Casual Casual { get; private set; } = null!;

    /// <summary>
    /// Unique claim token embedded in SMS link. 32-char hex (GUID without dashes).
    /// </summary>
    public string ClaimToken { get; private set; } = string.Empty;

    public DateTime TokenExpiresAt { get; private set; }
    public TokenStatus TokenStatus { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UsedAt { get; private set; }

    private ShiftNotification() { }

    /// <summary>
    /// Creates a notification for a casual about a shift.
    /// Token expires when the shift starts - no point claiming after it's begun.
    /// </summary>
    public static ShiftNotification Create(
        Shift shift,
        Casual casual,
        TimeProvider timeProvider)
    {
        return new ShiftNotification
        {
            Id = Guid.NewGuid(),
            ShiftId = shift.Id,
            Shift = shift,
            CasualId = casual.Id,
            Casual = casual,
            ClaimToken = Guid.NewGuid().ToString("N"),
            TokenExpiresAt = shift.StartsAt, // Expires when shift starts
            TokenStatus = TokenStatus.Pending,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
        };
    }

    /// <summary>
    /// Marks the token as used after a successful claim.
    /// </summary>
    public Result<ShiftNotification> MarkAsUsed(TimeProvider timeProvider)
    {
        if (TokenStatus == TokenStatus.Used)
            return Result<ShiftNotification>.Failure("Token has already been used");

        if (TokenStatus == TokenStatus.Revoked)
            return Result<ShiftNotification>.Failure("Token has been revoked");

        if (TokenStatus == TokenStatus.Expired || timeProvider.GetUtcNow().UtcDateTime > TokenExpiresAt)
        {
            TokenStatus = TokenStatus.Expired;
            return Result<ShiftNotification>.Failure("Token has expired");
        }

        TokenStatus = TokenStatus.Used;
        UsedAt = timeProvider.GetUtcNow().UtcDateTime;

        return Result<ShiftNotification>.Success(this);
    }

    /// <summary>
    /// Revokes the token (e.g., when shift is cancelled or filled).
    /// </summary>
    public void Revoke()
    {
        if (TokenStatus == TokenStatus.Pending)
        {
            TokenStatus = TokenStatus.Revoked;
        }
    }

    /// <summary>
    /// Checks if the token is still valid for claiming.
    /// </summary>
    public bool IsValid(TimeProvider timeProvider)
    {
        return TokenStatus == TokenStatus.Pending
            && timeProvider.GetUtcNow().UtcDateTime <= TokenExpiresAt;
    }
}

public enum TokenStatus
{
    Pending,
    Used,
    Expired,
    Revoked,
}
