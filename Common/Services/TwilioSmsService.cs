using ShiftDrop.Domain;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using TwilioPhoneNumber = Twilio.Types.PhoneNumber;

namespace ShiftDrop.Common.Services;

/// <summary>
/// Twilio SMS implementation using the official Twilio SDK.
/// Sends real SMS messages and captures MessageSid for delivery tracking.
/// </summary>
public class TwilioSmsService : ISmsService
{
    private readonly ILogger<TwilioSmsService> _logger;
    private readonly string _fromNumber;

    public TwilioSmsService(
        ILogger<TwilioSmsService> logger,
        IConfiguration config)
    {
        _logger = logger;

        var accountSid = config["Twilio:AccountSid"] ?? throw new InvalidOperationException("Twilio:AccountSid not configured");
        var authToken = config["Twilio:AuthToken"] ?? throw new InvalidOperationException("Twilio:AuthToken not configured");
        _fromNumber = config["Twilio:FromNumber"] ?? throw new InvalidOperationException("Twilio:FromNumber not configured");

        // Initialize Twilio client once at startup
        TwilioClient.Init(accountSid, authToken);
    }

    public async Task SendShiftBroadcast(ShiftBroadcastPayload payload, CancellationToken ct)
    {
        var body = $"{payload.ShiftDescription}\nClaim: {payload.ClaimUrl}";
        await SendSms(payload.PhoneNumber, body, "ShiftBroadcast", ct);
    }

    public async Task SendInviteSms(InviteSmsPayload payload, CancellationToken ct)
    {
        var body = $"Hi {payload.CasualName}! You've been invited to join {payload.PoolName}. Verify: {payload.VerifyUrl}";
        await SendSms(payload.PhoneNumber, body, "InviteSms", ct);
    }

    public async Task SendAdminInviteSms(AdminInviteSmsPayload payload, CancellationToken ct)
    {
        var body = $"Hi {payload.AdminName}! You've been invited to admin {payload.PoolName}. Accept: {payload.AcceptUrl}";
        await SendSms(payload.PhoneNumber, body, "AdminInviteSms", ct);
    }

    public async Task SendClaimConfirmation(ClaimConfirmationPayload payload, CancellationToken ct)
    {
        var body = $"Confirmed! {payload.ShiftDescription}";
        await SendSms(payload.PhoneNumber, body, "ClaimConfirmation", ct);
    }

    public async Task SendShiftReopened(ShiftReopenedPayload payload, CancellationToken ct)
    {
        var body = $"Spot opened! {payload.ShiftDescription}\nClaim: {payload.ClaimUrl}";
        await SendSms(payload.PhoneNumber, body, "ShiftReopened", ct);
    }

    private async Task SendSms(string to, string body, string messageType, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        try
        {
            // Note: Twilio SDK doesn't accept CancellationToken, so we check before only.
            // We intentionally do NOT check after send - if SMS was sent successfully,
            // throwing would cause outbox retry and send a duplicate message.
            var message = await MessageResource.CreateAsync(
                to: new TwilioPhoneNumber(to),
                from: new TwilioPhoneNumber(_fromNumber),
                body: body
            );

            _logger.LogInformation(
                "SMS sent successfully. Type: {MessageType}, To: {ToRedacted}, MessageSid: {MessageSid}, Status: {Status}",
                messageType, RedactPhone(to), message.Sid, message.Status);
        }
        catch (OperationCanceledException)
        {
            throw; // Don't log cancellation as error
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send SMS. Type: {MessageType}, To: {ToRedacted}, Error: {Error}",
                messageType, RedactPhone(to), ex.Message);
            throw;
        }
    }

    private static string RedactPhone(string phone) =>
        phone.Length > 4 ? $"***{phone[^4..]}" : "****";
}
