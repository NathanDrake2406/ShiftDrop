using System.Security.Claims;
using ShiftDrop.Common;
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

        var pool = await db.GetAuthorizedPoolAsync(poolId, managerId, ct, includeCasuals: true);
        if (pool == null)
            return Results.NotFound();

        return Results.Ok(new PoolDetailResponse(pool));
    }
}
