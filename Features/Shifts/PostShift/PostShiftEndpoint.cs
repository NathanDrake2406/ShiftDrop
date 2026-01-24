using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.PostShift;

public static class PostShiftEndpoint
{
    public static void MapPostShift(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/shifts", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        PostShiftRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        IConfiguration config,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pool = await db.Pools
            .Include(p => p.Casuals)
            .Include(p => p.Shifts)
            .FirstOrDefaultAsync(p => p.Id == poolId && p.ManagerAuth0Id == managerId, ct);

        if (pool == null)
            return Results.NotFound();

        var result = pool.PostShift(request.StartsAt, request.EndsAt, request.SpotsNeeded, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        var shift = result.Value!;
        var baseUrl = config["App:BaseUrl"] ?? "https://shiftdrop.local";

        // Create ShiftNotification and queue SMS for each active casual
        var activeCasuals = pool.Casuals.Where(c => c.IsActive).ToList();
        foreach (var casual in activeCasuals)
        {
            var notification = ShiftNotification.Create(shift, casual, timeProvider);
            db.ShiftNotifications.Add(notification);

            var payload = new ShiftBroadcastPayload(
                notification.Id,
                casual.PhoneNumber,
                $"New shift: {shift.StartsAt:g} - {shift.EndsAt:g}. {shift.SpotsRemaining} spot(s)!",
                $"{baseUrl}/casual/claim/{notification.ClaimToken}"
            );
            db.OutboxMessages.Add(OutboxMessage.Create(payload, timeProvider));
        }

        await db.SaveChangesAsync(ct);

        return Results.Created(
            $"/pools/{poolId}/shifts/{shift.Id}",
            new ShiftResponse(shift));
    }
}

public record PostShiftRequest(DateTime StartsAt, DateTime EndsAt, int SpotsNeeded);
