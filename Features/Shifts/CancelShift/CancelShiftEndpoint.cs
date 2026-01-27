using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.CancelShift;

public static class CancelShiftEndpoint
{
    public static void MapCancelShift(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/shifts/{shiftId:guid}/cancel", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid shiftId,
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pool = await db.GetAuthorizedPoolAsync(poolId, managerId, ct);
        if (pool == null)
            return Results.NotFound();

        var shift = await db.Shifts
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.PoolId == poolId, ct);

        if (shift == null)
            return Results.NotFound();

        shift.Cancel();

        // Revoke all pending claim tokens for this shift
        var pendingNotifications = await db.ShiftNotifications
            .Where(sn => sn.ShiftId == shiftId && sn.TokenStatus == TokenStatus.Pending)
            .ToListAsync(ct);

        foreach (var notification in pendingNotifications)
        {
            notification.Revoke();
        }

        await db.SaveChangesAsync(ct);

        return Results.Ok(new ShiftResponse(shift));
    }
}
