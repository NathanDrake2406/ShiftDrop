using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common;
using ShiftDrop.Common.Responses;

namespace ShiftDrop.Features.Shifts.GetShifts;

public static class GetShiftsEndpoint
{
    public static void MapGetShifts(this RouteGroupBuilder group)
    {
        group.MapGet("/{poolId:guid}/shifts", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
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

        var shifts = await db.Shifts
            .Where(s => s.PoolId == poolId)
            .Include(s => s.Claims)
                .ThenInclude(c => c.Casual)
            .OrderByDescending(s => s.StartsAt)
            .ToListAsync(ct);

        return Results.Ok(shifts.Select(s => new ShiftDetailResponse(s)));
    }
}
