using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;

namespace ShiftDrop.Features.Pools.GetPools;

public static class GetPoolsEndpoint
{
    public static void MapGetPools(this RouteGroupBuilder group)
    {
        group.MapGet("/", Handle);
    }

    private static async Task<IResult> Handle(
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pools = await db.Pools
            .Where(p => p.ManagerAuth0Id == managerId)
            .Select(p => new PoolResponse(p))
            .ToListAsync(ct);

        return Results.Ok(pools);
    }
}
