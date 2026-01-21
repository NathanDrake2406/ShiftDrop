using ShiftDrop.Domain;

namespace ShiftDrop.Common.Services;

public class ConsoleSmsService : ISmsService
{
    public Task BroadcastShiftAvailable(Shift shift, IEnumerable<Casual> casuals)
    {
        foreach (var casual in casuals)
        {
            Console.WriteLine($"[SMS to {casual.PhoneNumber}] New shift available: {shift.StartsAt:g} - {shift.EndsAt:g}. {shift.SpotsRemaining} spot(s) left!");
        }
        return Task.CompletedTask;
    }

    public Task NotifyShiftClaimed(Shift shift, Casual casual)
    {
        Console.WriteLine($"[SMS to {casual.PhoneNumber}] You've claimed the shift on {shift.StartsAt:g}. See you there!");
        return Task.CompletedTask;
    }
}
