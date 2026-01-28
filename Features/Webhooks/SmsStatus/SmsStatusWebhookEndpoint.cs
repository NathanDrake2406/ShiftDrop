using System.Security.Cryptography;
using System.Text;

namespace ShiftDrop.Features.Webhooks.SmsStatus;

public static class SmsStatusWebhookEndpoint
{
    public static void MapSmsStatusWebhook(this WebApplication app)
    {
        app.MapPost("/webhooks/sms-status", Handle).AllowAnonymous();
    }

    private static async Task<IResult> Handle(
        HttpRequest request,
        AppDbContext db,
        IConfiguration config,
        ILoggerFactory loggerFactory,
        CancellationToken ct)
    {
        var logger = loggerFactory.CreateLogger("SmsStatusWebhook");

        // Read form async FIRST to avoid sync I/O issues
        var form = await request.ReadFormAsync(ct);

        // Verify webhook signature (Twilio uses X-Twilio-Signature header)
        var signature = request.Headers["X-Twilio-Signature"].FirstOrDefault();
        var authToken = config["Twilio:AuthToken"];

        // If auth token is configured, signature verification is REQUIRED
        if (!string.IsNullOrEmpty(authToken))
        {
            if (string.IsNullOrEmpty(signature))
            {
                logger.LogWarning("Twilio webhook signature missing when auth is configured");
                return Results.Unauthorized();
            }

            if (!VerifyTwilioSignature(request, form, signature, authToken))
            {
                logger.LogWarning("Invalid Twilio webhook signature");
                return Results.Unauthorized();
            }
        }

        // Parse Twilio webhook payload
        var messageSid = form["MessageSid"].FirstOrDefault();
        var messageStatus = form["MessageStatus"].FirstOrDefault();
        var errorCode = form["ErrorCode"].FirstOrDefault();

        if (string.IsNullOrEmpty(messageSid) || string.IsNullOrEmpty(messageStatus))
        {
            return Results.BadRequest(new { error = "Missing required fields" });
        }

        logger.LogInformation(
            "SMS status update: {MessageSid} -> {Status} (ErrorCode: {ErrorCode})",
            messageSid, messageStatus, errorCode ?? "none");

        // Note: In a full implementation, you would:
        // 1. Store the Twilio MessageSid when sending SMS
        // 2. Look up the outbox message by MessageSid
        // 3. Update delivery status for analytics/retry decisions

        return Results.Ok();
    }

    /// <summary>
    /// Verifies Twilio webhook signature using HMAC-SHA1.
    /// See: https://www.twilio.com/docs/usage/security#validating-requests
    /// </summary>
    private static bool VerifyTwilioSignature(
        HttpRequest request,
        IFormCollection form,
        string signature,
        string authToken)
    {
        // Build the full URL
        var url = $"{request.Scheme}://{request.Host}{request.Path}";

        // Sort form parameters and append to URL
        var sortedParams = form.Keys
            .OrderBy(k => k)
            .Select(k => $"{k}{form[k]}")
            .ToList();

        var data = url + string.Join("", sortedParams);

        // Compute HMAC-SHA1
        using var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(authToken));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var computedSignature = Convert.ToBase64String(hash);

        return signature == computedSignature;
    }
}
