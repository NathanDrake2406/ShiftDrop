using Microsoft.EntityFrameworkCore;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Casuals.PushSubscribe;

public record PushSubscribeRequest(string Endpoint, string P256dh, string Auth);

public static class PushSubscribeEndpoint
{
    public static void MapPushSubscribe(this RouteGroupBuilder group)
    {
        group.MapPost("/push/subscribe/{phoneNumber}", Subscribe);
        group.MapPost("/push/unsubscribe/{phoneNumber}", Unsubscribe);
    }

    private static async Task<IResult> Subscribe(
        string phoneNumber,
        PushSubscribeRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        CancellationToken ct)
    {
        var phoneResult = PhoneNumber.Parse(phoneNumber);
        if (phoneResult.IsFailure)
            return Results.BadRequest(new { error = phoneResult.Error });

        var parsedPhone = phoneResult.Value;

        // Note: Cannot use c.IsActive (computed property) in LINQ-to-Entities.
        // Inline the expression for database translation.
        var casual = await db.Casuals
            .FirstOrDefaultAsync(c => c.PhoneNumber == parsedPhone
                                      && c.InviteStatus == InviteStatus.Accepted
                                      && c.OptedOutAt == null, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Casual not found or not active" });

        // Check if subscription already exists
        var existing = await db.PushSubscriptions
            .FirstOrDefaultAsync(ps => ps.CasualId == casual.Id && ps.Endpoint == request.Endpoint, ct);

        if (existing != null)
        {
            if (!existing.IsActive)
            {
                // Reactivate by replacing with new subscription
                db.PushSubscriptions.Remove(existing);
                var newSub = PushSubscription.Create(casual, request.Endpoint, request.P256dh, request.Auth, timeProvider);
                db.PushSubscriptions.Add(newSub);
            }
            // If already active, do nothing - already subscribed
        }
        else
        {
            var subscription = PushSubscription.Create(casual, request.Endpoint, request.P256dh, request.Auth, timeProvider);
            db.PushSubscriptions.Add(subscription);
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok(new { message = "Subscribed to push notifications" });
    }

    private static async Task<IResult> Unsubscribe(
        string phoneNumber,
        PushSubscribeRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var phoneResult = PhoneNumber.Parse(phoneNumber);
        if (phoneResult.IsFailure)
            return Results.BadRequest(new { error = phoneResult.Error });

        var parsedPhone = phoneResult.Value;
        var casual = await db.Casuals
            .FirstOrDefaultAsync(c => c.PhoneNumber == parsedPhone, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Casual not found" });

        var subscription = await db.PushSubscriptions
            .FirstOrDefaultAsync(ps => ps.CasualId == casual.Id && ps.Endpoint == request.Endpoint, ct);

        if (subscription != null)
        {
            subscription.Deactivate();
            await db.SaveChangesAsync(ct);
        }

        return Results.Ok(new { message = "Unsubscribed from push notifications" });
    }
}
