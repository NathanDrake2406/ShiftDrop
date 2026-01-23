using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
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

        var shift = await db.Shifts
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.PoolId == poolId && s.Pool.ManagerAuth0Id == managerId, ct);

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
