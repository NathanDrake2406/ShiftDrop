namespace ShiftDrop.Domain;

public class Shift
{
    public Guid Id { get; private set; }
    public DateTime StartsAt { get; private set; }
    public DateTime EndsAt { get; private set; }
    public int SpotsNeeded { get; private set; }
    public int SpotsRemaining { get; private set; }
    public ShiftStatus Status { get; private set; }
    public Guid PoolId { get; private set; }
    public Pool Pool { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    
    private readonly List<ShiftClaim> _claims = new();
    public IReadOnlyCollection<ShiftClaim> Claims => _claims.AsReadOnly();

    private Shift() { }

    internal static Result<Shift> Create(DateTime startsAt, DateTime endsAt, int spotsNeeded, Pool pool, TimeProvider timeProvider)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        
        if (startsAt <= now)
            return Result<Shift>.Failure("Shift must start in the future");
        
        if (endsAt <= startsAt)
            return Result<Shift>.Failure("Shift end time must be after start time");
        
        if (spotsNeeded < 1)
            return Result<Shift>.Failure("At least one spot is required");

        var shift = new Shift
        {
            Id = Guid.NewGuid(),
            StartsAt = startsAt,
            EndsAt = endsAt,
            SpotsNeeded = spotsNeeded,
            SpotsRemaining = spotsNeeded,
            Status = ShiftStatus.Open,
            Pool = pool,
            PoolId = pool.Id,
            CreatedAt = now
        };

        return Result<Shift>.Success(shift);
    }

    internal Result<ShiftClaim> AcceptClaim(Casual casual, TimeProvider timeProvider)
    {
        if (StartsAt <= timeProvider.GetUtcNow().UtcDateTime)
            return Result<ShiftClaim>.Failure("This shift has already started");

        if (Status == ShiftStatus.Filled)
            return Result<ShiftClaim>.Failure("This shift is already filled");

        if (Status == ShiftStatus.Cancelled)
            return Result<ShiftClaim>.Failure("This shift has been cancelled");

        if (SpotsRemaining <= 0)
            return Result<ShiftClaim>.Failure("No spots remaining for this shift");

        var claim = ShiftClaim.Create(this, casual, timeProvider);
        _claims.Add(claim);
        SpotsRemaining--;

        if (SpotsRemaining == 0)
            Status = ShiftStatus.Filled;

        return Result<ShiftClaim>.Success(claim);
    }

    internal void ReleaseClaim()
    {
        SpotsRemaining++;
        if (Status == ShiftStatus.Filled)
            Status = ShiftStatus.Open;
    }

    public Result<ShiftClaim> ManagerReleaseCasual(Casual casual, TimeProvider timeProvider)
    {
        var claim = _claims.FirstOrDefault(c => c.CasualId == casual.Id && c.Status == ClaimStatus.Claimed);
        if (claim == null)
            return Result<ShiftClaim>.Failure("Casual does not have an active claim on this shift");

        claim.MarkAsReleasedByManager(timeProvider);
        ReleaseClaim();
        
        return Result<ShiftClaim>.Success(claim);
    }

    public void Cancel()
    {
        Status = ShiftStatus.Cancelled;
    }

    public List<Casual> GetClaimedCasuals()
    {
        return _claims
            .Where(c => c.Status == ClaimStatus.Claimed)
            .Select(c => c.Casual)
            .ToList();
    }
}

public enum ShiftStatus
{
    Open,
    Filled,
    Cancelled
}
