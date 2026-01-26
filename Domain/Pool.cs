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

    private readonly List<PoolAdmin> _admins = new();
    public IReadOnlyCollection<PoolAdmin> Admins => _admins.AsReadOnly();

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

    /// <summary>
    /// Returns true if the given Auth0 ID is authorized to manage this pool
    /// (either as owner or as an accepted admin).
    /// </summary>
    public bool IsAuthorized(string auth0Id)
    {
        if (string.IsNullOrEmpty(auth0Id))
            return false;

        if (ManagerAuth0Id == auth0Id)
            return true;

        return _admins.Any(a => a.IsAccepted && a.Auth0Id == auth0Id);
    }

    public Result<PoolAdmin> InviteAdmin(string phoneNumber, string name, TimeProvider timeProvider)
    {
        var adminResult = PoolAdmin.Create(phoneNumber, name, this, timeProvider);
        if (adminResult.IsFailure)
            return adminResult;

        var admin = adminResult.Value!;
        if (_admins.Any(a => a.PhoneNumber == admin.PhoneNumber))
            return Result<PoolAdmin>.Failure("An admin with this phone number already exists");

        _admins.Add(admin);
        return Result<PoolAdmin>.Success(admin);
    }

    public Result<Pool> RemoveAdmin(Guid adminId)
    {
        var admin = _admins.FirstOrDefault(a => a.Id == adminId);
        if (admin == null)
            return Result<Pool>.Failure("Admin not found");

        _admins.Remove(admin);
        return Result<Pool>.Success(this);
    }
}
