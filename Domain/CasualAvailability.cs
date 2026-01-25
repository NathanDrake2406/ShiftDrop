namespace ShiftDrop.Domain;

public class CasualAvailability
{
    public Guid Id { get; private set; }
    public Guid CasualId { get; private set; }
    public Casual Casual { get; private set; } = null!;
    public DayOfWeek DayOfWeek { get; private set; }
    public TimeOnly FromTime { get; private set; }
    public TimeOnly ToTime { get; private set; }

    private CasualAvailability() { }

    internal static Result<CasualAvailability> Create(
        Casual casual,
        DayOfWeek dayOfWeek,
        TimeOnly fromTime,
        TimeOnly toTime)
    {
        if (fromTime >= toTime)
            return Result<CasualAvailability>.Failure("From time must be before to time");

        var availability = new CasualAvailability
        {
            Id = Guid.NewGuid(),
            CasualId = casual.Id,
            Casual = casual,
            DayOfWeek = dayOfWeek,
            FromTime = fromTime,
            ToTime = toTime,
        };

        return Result<CasualAvailability>.Success(availability);
    }
}
