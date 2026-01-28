// Common/Services/WebPushNotificationService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebPush;

namespace ShiftDrop.Common.Services;

public class WebPushOptions
{
    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
}

public class WebPushNotificationService : IPushNotificationService
{
    private readonly AppDbContext _db;
    private readonly WebPushClient _client;
    private readonly VapidDetails _vapidDetails;
    private readonly ILogger<WebPushNotificationService> _logger;
    private readonly TimeProvider _timeProvider;

    public WebPushNotificationService(
        AppDbContext db,
        IOptions<WebPushOptions> options,
        ILogger<WebPushNotificationService> logger,
        TimeProvider timeProvider)
    {
        _db = db;
        _logger = logger;
        _timeProvider = timeProvider;
        _client = new WebPushClient();
        _vapidDetails = new VapidDetails(
            options.Value.Subject,
            options.Value.PublicKey,
            options.Value.PrivateKey);
    }

    public async Task SendAsync(Guid casualId, string title, string body, string? url = null, CancellationToken ct = default)
    {
        var subscriptions = await _db.PushSubscriptions
            .Where(ps => ps.CasualId == casualId && ps.IsActive)
            .ToListAsync(ct);

        foreach (var subscription in subscriptions)
        {
            await SendToSubscriptionAsync(subscription, title, body, url, ct);
        }
    }

    public async Task SendToSubscriptionAsync(
        Domain.PushSubscription subscription,
        string title,
        string body,
        string? url = null,
        CancellationToken ct = default)
    {
        var pushSubscription = new WebPush.PushSubscription(
            subscription.Endpoint,
            subscription.P256dh,
            subscription.Auth);

        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            title,
            body,
            url,
            timestamp = _timeProvider.GetUtcNow().ToUnixTimeMilliseconds()
        });

        try
        {
            await _client.SendNotificationAsync(pushSubscription, payload, _vapidDetails);
            subscription.MarkUsed(_timeProvider);
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Push notification sent to {Endpoint}", subscription.Endpoint);
        }
        catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
        {
            // Subscription no longer valid
            subscription.Deactivate();
            await _db.SaveChangesAsync(ct);
            _logger.LogWarning("Push subscription expired, deactivated: {Endpoint}", subscription.Endpoint);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send push notification to {Endpoint}", subscription.Endpoint);
        }
    }
}
