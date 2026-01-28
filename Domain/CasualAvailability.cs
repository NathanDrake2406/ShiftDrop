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

    /// <summary>
    /// Returns true if this is an overnight availability window (e.g., 22:00 to 06:00).
    /// </summary>
    public bool IsOvernight => FromTime > ToTime;

    /// <summary>
    /// Checks if a given time falls within this availability window.
    /// Handles both normal windows (09:00-17:00) and overnight windows (22:00-06:00).
    /// </summary>
    public bool ContainsTime(TimeOnly time)
    {
        if (IsOvernight)
        {
            // Overnight: valid if time >= from OR time <= to
            // e.g., 22:00-06:00 includes 23:00 (>=22) and 02:00 (<=06)
            return time >= FromTime || time <= ToTime;
        }
        else
        {
            // Normal: valid if time >= from AND time <= to
            return time >= FromTime && time <= ToTime;
        }
    }

    internal static Result<CasualAvailability> Create(
        Casual casual,
        DayOfWeek dayOfWeek,
        TimeOnly fromTime,
        TimeOnly toTime)
    {
        // Only reject if times are exactly equal (zero-length window makes no sense)
        if (fromTime == toTime)
            return Result<CasualAvailability>.Failure("From time and to time cannot be the same");

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
