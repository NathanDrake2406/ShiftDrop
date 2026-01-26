// Common/Services/IPushNotificationService.cs
namespace ShiftDrop.Common.Services;

public interface IPushNotificationService
{
    Task SendAsync(Guid casualId, string title, string body, string? url = null, CancellationToken ct = default);
    Task SendToSubscriptionAsync(Domain.PushSubscription subscription, string title, string body, string? url = null, CancellationToken ct = default);
}
