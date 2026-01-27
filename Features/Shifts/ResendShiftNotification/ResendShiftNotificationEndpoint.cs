using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.ResendShiftNotification;

public static class ResendShiftNotificationEndpoint
{
    public static void MapResendShiftNotification(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/shifts/{shiftId:guid}/resend", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid shiftId,
        AppDbContext db,
        TimeProvider timeProvider,
        IConfiguration config,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pool = await db.GetAuthorizedPoolAsync(
            poolId, managerId, ct,
            includeCasuals: true,
            includeShifts: true,
            includeCasualAvailability: true);
        if (pool == null)
            return Results.NotFound(new { error = "Pool not found" });

        var shift = pool.Shifts.FirstOrDefault(s => s.Id == shiftId);
        if (shift == null)
            return Results.NotFound(new { error = "Shift not found" });

        if (shift.Status == ShiftStatus.Cancelled)
            return Results.BadRequest(new { error = "Cannot resend notifications for cancelled shifts" });

        if (shift.Status == ShiftStatus.Filled)
            return Results.BadRequest(new { error = "Shift is already filled" });

        // Get existing notifications for this shift
        var existingNotifications = await db.ShiftNotifications
            .Where(n => n.ShiftId == shiftId)
            .ToListAsync(ct);

        var baseUrl = config["App:BaseUrl"] ?? "https://shiftdrop.local";

        // Convert shift times to Australian Eastern Time for display
        var aest = TimeZoneInfo.FindSystemTimeZoneById("Australia/Sydney");
        var utcStart = DateTime.SpecifyKind(shift.StartsAt, DateTimeKind.Utc);
        var utcEnd = DateTime.SpecifyKind(shift.EndsAt, DateTimeKind.Utc);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(utcStart, aest);
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(utcEnd, aest);
        var shiftTimeDisplay = $"{localStart:ddd d MMM, h:mmtt} - {localEnd:h:mmtt}";

        // Find active casuals who haven't claimed this shift yet and are available
        var casualsWhoClaimedIds = shift.Claims
            .Where(c => c.Status == ClaimStatus.Claimed)
            .Select(c => c.CasualId)
            .ToHashSet();

        var casualsToNotify = pool.Casuals
            .Where(c => c.IsActive &&
                        c.IsAvailableFor(shift.StartsAt, shift.EndsAt) &&
                        !casualsWhoClaimedIds.Contains(c.Id))
            .ToList();

        if (casualsToNotify.Count == 0)
            return Results.Ok(new ResendShiftNotificationResponse(0, "No casuals to notify"));

        var notifiedCount = 0;
        foreach (var casual in casualsToNotify)
        {
            // Reuse existing notification if available and not used, otherwise create new
            var existingNotification = existingNotifications
                .FirstOrDefault(n => n.CasualId == casual.Id && n.TokenStatus == TokenStatus.Pending);

            ShiftNotification notification;
            if (existingNotification != null)
            {
                notification = existingNotification;
            }
            else
            {
                notification = ShiftNotification.Create(shift, casual, timeProvider);
                db.ShiftNotifications.Add(notification);
            }

            var payload = new ShiftBroadcastPayload(
                notification.Id,
                casual.PhoneNumber,
                $"Reminder: {shiftTimeDisplay}. {shift.SpotsRemaining} spot(s) left!",
                $"{baseUrl}/casual/claim/{notification.ClaimToken}"
            );
            db.OutboxMessages.Add(OutboxMessage.Create(payload, timeProvider));
            notifiedCount++;
        }

        await db.SaveChangesAsync(ct);

        return Results.Ok(new ResendShiftNotificationResponse(
            notifiedCount,
            $"Notification sent to {notifiedCount} casual{(notifiedCount == 1 ? "" : "s")}"
        ));
    }
}

public record ResendShiftNotificationResponse(int NotifiedCount, string Message);
