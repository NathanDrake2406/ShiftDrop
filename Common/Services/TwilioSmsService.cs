using ShiftDrop.Domain;

namespace ShiftDrop.Common.Services;

/// <summary>
/// Twilio SMS implementation. In production, this would use the Twilio SDK.
/// Currently a placeholder that logs what would be sent.
/// </summary>
public class TwilioSmsService : ISmsService
{
    private readonly ILogger<TwilioSmsService> _logger;
    private readonly string _accountSid;
    private readonly string _authToken;
    private readonly string _fromNumber;

    public TwilioSmsService(
        ILogger<TwilioSmsService> logger,
        IConfiguration config)
    {
        _logger = logger;
        _accountSid = config["Twilio:AccountSid"] ?? throw new InvalidOperationException("Twilio:AccountSid not configured");
        _authToken = config["Twilio:AuthToken"] ?? throw new InvalidOperationException("Twilio:AuthToken not configured");
        _fromNumber = config["Twilio:FromNumber"] ?? throw new InvalidOperationException("Twilio:FromNumber not configured");
    }

    public Task BroadcastShiftAvailable(Shift shift, IEnumerable<Casual> casuals)
    {
        // Legacy method - should migrate to outbox pattern
        foreach (var casual in casuals)
        {
            _logger.LogInformation(
                "Would send SMS to {PhoneNumber}: New shift {ShiftId}",
                casual.PhoneNumber, shift.Id);
        }
        return Task.CompletedTask;
    }

    public Task NotifyShiftClaimed(Shift shift, Casual casual)
    {
        // Legacy method - should migrate to outbox pattern
        _logger.LogInformation(
            "Would send SMS to {PhoneNumber}: Shift {ShiftId} claimed",
            casual.PhoneNumber, shift.Id);
        return Task.CompletedTask;
    }

    public async Task SendShiftBroadcast(ShiftBroadcastPayload payload, CancellationToken ct)
    {
        await SendSms(payload.PhoneNumber, $"{payload.ShiftDescription}\nClaim: {payload.ClaimUrl}", ct);
    }

    public async Task SendInviteSms(InviteSmsPayload payload, CancellationToken ct)
    {
        var message = $"Hi {payload.CasualName}! You've been invited to join {payload.PoolName}. Verify: {payload.VerifyUrl}";
        await SendSms(payload.PhoneNumber, message, ct);
    }

    public async Task SendClaimConfirmation(ClaimConfirmationPayload payload, CancellationToken ct)
    {
        await SendSms(payload.PhoneNumber, $"Confirmed! {payload.ShiftDescription}", ct);
    }

    private async Task SendSms(string to, string body, CancellationToken ct)
    {
        // TODO: Replace with actual Twilio SDK call:
        // var message = await MessageResource.CreateAsync(
        //     to: new PhoneNumber(to),
        //     from: new PhoneNumber(_fromNumber),
        //     body: body
        // );

        _logger.LogInformation(
            "Twilio SMS from {From} to {To}: {Body}",
            _fromNumber, to, body);

        // Simulate network latency
        await Task.Delay(100, ct);
    }
}
