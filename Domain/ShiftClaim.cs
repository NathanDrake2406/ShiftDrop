namespace ShiftDrop.Domain;

public class ShiftClaim
{
    public Guid Id { get; private set; }
    public Guid ShiftId { get; private set; }
    public Shift Shift { get; private set; } = null!;
    public Guid CasualId { get; private set; }
    public Casual Casual { get; private set; } = null!;
    public ClaimStatus Status { get; private set; }
    public DateTime ClaimedAt { get; private set; }
    public DateTime? ReleasedAt { get; private set; }

    private ShiftClaim() { }

    internal static ShiftClaim Create(Shift shift, Casual casual, TimeProvider timeProvider)
    {
        return new ShiftClaim
        {
            Id = Guid.NewGuid(),
            Shift = shift,
            ShiftId = shift.Id,
            Casual = casual,
            CasualId = casual.Id,
            Status = ClaimStatus.Claimed,
            ClaimedAt = timeProvider.GetUtcNow().UtcDateTime
        };
    }

    internal void MarkAsBailed(TimeProvider timeProvider)
    {
        Status = ClaimStatus.Bailed;
        ReleasedAt = timeProvider.GetUtcNow().UtcDateTime;
    }

    internal void MarkAsReleasedByManager(TimeProvider timeProvider)
    {
        Status = ClaimStatus.ReleasedByManager;
        ReleasedAt = timeProvider.GetUtcNow().UtcDateTime;
    }
}

public enum ClaimStatus
{
    Claimed,
    Bailed,
    ReleasedByManager
}
