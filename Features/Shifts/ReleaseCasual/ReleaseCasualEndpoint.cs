using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;
using TimeZoneConverter;

namespace ShiftDrop.Features.Shifts.ReleaseCasual;

public static class ReleaseCasualEndpoint
{
    public static void MapReleaseCasual(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/shifts/{shiftId:guid}/release/{casualId:guid}", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid shiftId,
        Guid casualId,
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
            includeCasualAvailability: true);
        if (pool == null)
            return Results.NotFound();

        var shift = await db.Shifts
            .Include(s => s.Claims)
                .ThenInclude(c => c.Casual)
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.PoolId == poolId, ct);

        if (shift == null)
            return Results.NotFound();

        var casual = pool.Casuals.FirstOrDefault(c => c.Id == casualId);
        if (casual == null)
            return Results.NotFound();

        var result = shift.ManagerReleaseCasual(casual, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        // Find casuals to notify: active, available, not already claimed, and not the one being released
        var claimedCasualIds = shift.Claims
            .Where(c => c.Status == ClaimStatus.Claimed)
            .Select(c => c.CasualId)
            .ToHashSet();

        var casualsToNotify = pool.Casuals
            .Where(c => c.IsActive
                && c.Id != casualId  // Don't notify the casual who was released
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

        return Results.Ok(new ShiftDetailResponse(shift));
    }

    private static string FormatShiftDescription(Shift shift)
    {
        // TZConvert handles cross-platform IANA/Windows timezone ID differences
        var aest = TZConvert.GetTimeZoneInfo("Australia/Sydney");
        var utcStart = DateTime.SpecifyKind(shift.StartsAt, DateTimeKind.Utc);
        var utcEnd = DateTime.SpecifyKind(shift.EndsAt, DateTimeKind.Utc);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(utcStart, aest);
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(utcEnd, aest);
        return $"{localStart:ddd d MMM, h:mmtt} - {localEnd:h:mmtt}";
    }
}
