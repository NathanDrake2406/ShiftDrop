using Microsoft.EntityFrameworkCore;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.ReleaseShift;

public static class ReleaseShiftEndpoint
{
    public static void MapReleaseShift(this RouteGroupBuilder group)
    {
        group.MapPost("/shifts/{shiftId:guid}/release", Handle);
    }

    private static async Task<IResult> Handle(
        Guid shiftId,
        ReleaseShiftRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        IConfiguration config,
        CancellationToken ct)
    {
        var casual = await db.Casuals
            .Include(c => c.Claims)
            .Include(c => c.Pool)
                .ThenInclude(p => p.Casuals)
                    .ThenInclude(c => c.Availability)
            .FirstOrDefaultAsync(c => c.PhoneNumber == request.PhoneNumber, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Casual not found with this phone number" });

        var shift = await db.Shifts
            .Include(s => s.Claims)
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.PoolId == casual.PoolId, ct);

        if (shift == null)
            return Results.NotFound(new { error = "Shift not found or not in your pool" });

        var result = casual.ReleaseShift(shift, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        // Find casuals to notify: active, available, not already claimed, and not the one who just released
        var claimedCasualIds = shift.Claims
            .Where(c => c.Status == ClaimStatus.Claimed)
            .Select(c => c.CasualId)
            .ToHashSet();

        var casualsToNotify = casual.Pool.Casuals
            .Where(c => c.IsActive
                && c.Id != casual.Id  // Don't notify the casual who just released
                && c.IsAvailableFor(shift.StartsAt, shift.EndsAt)
                && !claimedCasualIds.Contains(c.Id))
            .ToList();

        // Queue SMS notifications via outbox
        var baseUrl = config["App:BaseUrl"] ?? "https://shiftdrop.local";
        var shiftDescription = FormatShiftDescription(shift);

        foreach (var casualToNotify in casualsToNotify)
        {
            var notification = ShiftNotification.Create(shift, casualToNotify, timeProvider);
            db.ShiftNotifications.Add(notification);

            var payload = new ShiftReopenedPayload(
                notification.Id,
                casualToNotify.PhoneNumber,
                $"Spot opened! {shiftDescription}. {shift.SpotsRemaining} spot(s)!",
                $"{baseUrl}/casual/claim/{notification.ClaimToken}"
            );
            db.OutboxMessages.Add(OutboxMessage.Create(payload, timeProvider));
        }

        await db.SaveChangesAsync(ct);

        return Results.Ok(new { message = "You've been released from this shift." });
    }

    private static string FormatShiftDescription(Shift shift)
    {
        var aest = TimeZoneInfo.FindSystemTimeZoneById("Australia/Sydney");
        var utcStart = DateTime.SpecifyKind(shift.StartsAt, DateTimeKind.Utc);
        var utcEnd = DateTime.SpecifyKind(shift.EndsAt, DateTimeKind.Utc);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(utcStart, aest);
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(utcEnd, aest);
        return $"{localStart:ddd d MMM, h:mmtt} - {localEnd:h:mmtt}";
    }
}

public record ReleaseShiftRequest(string PhoneNumber);
