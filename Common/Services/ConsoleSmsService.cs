using ShiftDrop.Domain;

namespace ShiftDrop.Common.Services;

/// <summary>
/// Console-based SMS service for development/testing.
/// Logs SMS content to console instead of sending real messages.
/// </summary>
public class ConsoleSmsService : ISmsService
{
    public Task SendShiftBroadcast(ShiftBroadcastPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {RedactPhone(payload.PhoneNumber)}] {payload.ShiftDescription}");
        Console.WriteLine($"  Claim now: {payload.ClaimUrl}");
        return Task.CompletedTask;
    }

    public Task SendInviteSms(InviteSmsPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {RedactPhone(payload.PhoneNumber)}] Hi {payload.CasualName}! You've been invited to join {payload.PoolName}.");
        Console.WriteLine($"  Verify your phone: {payload.VerifyUrl}");
        return Task.CompletedTask;
    }

    public Task SendAdminInviteSms(AdminInviteSmsPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {RedactPhone(payload.PhoneNumber)}] Hi {payload.AdminName}! You've been invited to admin {payload.PoolName}.");
        Console.WriteLine($"  Accept invite: {payload.AcceptUrl}");
        return Task.CompletedTask;
    }

    public Task SendClaimConfirmation(ClaimConfirmationPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {RedactPhone(payload.PhoneNumber)}] Confirmed! {payload.ShiftDescription}");
        return Task.CompletedTask;
    }

    public Task SendShiftReopened(ShiftReopenedPayload payload, CancellationToken ct)
    {
        Console.WriteLine($"[SMS to {RedactPhone(payload.PhoneNumber)}] Spot opened! {payload.ShiftDescription}");
        Console.WriteLine($"  Claim now: {payload.ClaimUrl}");
        return Task.CompletedTask;
    }

    private static string RedactPhone(string phone) =>
        phone.Length > 4 ? $"***{phone[^4..]}" : "****";
}
