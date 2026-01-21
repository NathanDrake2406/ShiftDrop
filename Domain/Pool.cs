namespace ShiftDrop.Domain;

public class Pool
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string ManagerAuth0Id { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    
    private readonly List<Casual> _casuals = new();
    public IReadOnlyCollection<Casual> Casuals => _casuals.AsReadOnly();
    
    private readonly List<Shift> _shifts = new();
    public IReadOnlyCollection<Shift> Shifts => _shifts.AsReadOnly();

    private Pool() { }

    public static Result<Pool> Create(string name, string managerAuth0Id, TimeProvider timeProvider)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Result<Pool>.Failure("Pool name cannot be empty");
        
        if (string.IsNullOrWhiteSpace(managerAuth0Id))
            return Result<Pool>.Failure("Manager ID is required");

        var pool = new Pool
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            ManagerAuth0Id = managerAuth0Id,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime
        };

        return Result<Pool>.Success(pool);
    }

    public Result<Casual> AddCasual(string name, string phoneNumber, TimeProvider timeProvider)
    {
        var casualResult = Casual.Create(name, phoneNumber, this, timeProvider);
        if (casualResult.IsFailure)
            return casualResult;

        _casuals.Add(casualResult.Value!);
        return casualResult;
    }

    public Result<Shift> PostShift(DateTime startsAt, DateTime endsAt, int spotsNeeded, TimeProvider timeProvider)
    {
        var shiftResult = Shift.Create(startsAt, endsAt, spotsNeeded, this, timeProvider);
        if (shiftResult.IsFailure)
            return shiftResult;

        _shifts.Add(shiftResult.Value!);
        return shiftResult;
    }

    public void RemoveCasual(Casual casual)
    {
        _casuals.Remove(casual);
    }
}
