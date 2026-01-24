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

    public Task SendShiftBroadcast(ShiftBroadcastPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {payload.PhoneNumber}] {payload.ShiftDescription}");
        Console.WriteLine($"  Claim now: {payload.ClaimUrl}");
        return Task.CompletedTask;
    }

    public Task SendInviteSms(InviteSmsPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {payload.PhoneNumber}] Hi {payload.CasualName}! You've been invited to join {payload.PoolName}.");
        Console.WriteLine($"  Verify your phone: {payload.VerifyUrl}");
        return Task.CompletedTask;
    }

    public Task SendClaimConfirmation(ClaimConfirmationPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {payload.PhoneNumber}] Confirmed! {payload.ShiftDescription}");
        return Task.CompletedTask;
    }
}
