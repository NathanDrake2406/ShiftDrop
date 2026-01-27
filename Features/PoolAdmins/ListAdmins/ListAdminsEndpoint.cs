using System.Security.Claims;
using ShiftDrop.Common;
using ShiftDrop.Common.Responses;

namespace ShiftDrop.Features.PoolAdmins.ListAdmins;

public static class ListAdminsEndpoint
{
    public static void MapListAdmins(this RouteGroupBuilder group)
    {
        group.MapGet("/{poolId:guid}/admins", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Results.Unauthorized();

        var pool = await db.GetAuthorizedPoolAsync(poolId, userId, ct);
        if (pool == null)
            return Results.NotFound();

        var admins = pool.Admins
            .Select(a => new PoolAdminResponse(a))
            .ToList();

        return Results.Ok(admins);
    }
}
