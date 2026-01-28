using System.Net;

namespace MulttenantSaas.Tests.Integration.Tier1_Critical;

/// <summary>
/// Security tests for webhook endpoints.
/// These are Tier 1 (critical) because webhook auth bypass is a security vulnerability.
/// </summary>
public class WebhookSecurityTests : IntegrationTestBase
{
    public WebhookSecurityTests(ShiftDropWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task SmsStatusWebhook_WhenAuthConfiguredButSignatureMissing_Returns401()
    {
        // Arrange: Send request WITHOUT X-Twilio-Signature header
        // (Factory configures Twilio:AuthToken, so signature should be required)
        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("MessageSid", "SM123"),
            new KeyValuePair<string, string>("MessageStatus", "delivered")
        });

        // Act
        var response = await Client.PostAsync("/webhooks/sms-status", content);

        // Assert: Should be rejected when auth is configured but signature is missing
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SmsStatusWebhook_WhenAuthConfiguredAndSignatureInvalid_Returns401()
    {
        // Arrange: Send request with invalid signature
        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("MessageSid", "SM123"),
            new KeyValuePair<string, string>("MessageStatus", "delivered")
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, "/webhooks/sms-status")
        {
            Content = content
        };
        request.Headers.Add("X-Twilio-Signature", "invalid-signature");

        // Act
        var response = await Client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SmsStatusWebhook_WithValidSignature_Returns200()
    {
        // Arrange: Compute valid signature for the request
        // The signature is HMAC-SHA1 of: URL + sorted params, using auth token as key
        var messageSid = "SM123";
        var messageStatus = "delivered";

        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("MessageSid", messageSid),
            new KeyValuePair<string, string>("MessageStatus", messageStatus)
        });

        // Build the data string that Twilio would sign
        // URL format: scheme://host/path + sorted params concatenated
        var baseUrl = "http://localhost/webhooks/sms-status";
        var sortedParams = $"MessageSid{messageSid}MessageStatus{messageStatus}";
        var dataToSign = baseUrl + sortedParams;

        // Compute HMAC-SHA1 signature
        using var hmac = new System.Security.Cryptography.HMACSHA1(
            System.Text.Encoding.UTF8.GetBytes(ShiftDropWebApplicationFactory.TestTwilioAuthToken));
        var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(dataToSign));
        var signature = Convert.ToBase64String(hash);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/webhooks/sms-status")
        {
            Content = content
        };
        request.Headers.Add("X-Twilio-Signature", signature);

        // Act
        var response = await Client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
