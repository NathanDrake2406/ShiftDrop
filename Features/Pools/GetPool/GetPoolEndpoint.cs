using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;

namespace ShiftDrop.Features.Pools.GetPool;

public static class GetPoolEndpoint
{
    public static void MapGetPool(this RouteGroupBuilder group)
    {
        group.MapGet("/{poolId:guid}", Handle);
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

        var pool = await db.Pools
            .Include(p => p.Casuals)
            .Include(p => p.Admins)
            .FirstOrDefaultAsync(p => p.Id == poolId, ct);

        if (pool == null)
            return Results.NotFound();

        if (!pool.IsAuthorized(managerId))
            return Results.Forbid();

        return Results.Ok(new PoolDetailResponse(pool));
    }
}
