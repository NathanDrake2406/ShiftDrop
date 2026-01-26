using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace ShiftDrop.Features.Pools.DeletePool;

public static class DeletePoolEndpoint
{
    public static void MapDeletePool(this RouteGroupBuilder group)
    {
        group.MapDelete("/{poolId:guid}", Handle);
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
            .FirstOrDefaultAsync(p => p.Id == poolId, ct);

        if (pool == null)
            return Results.NotFound();

        // Only the pool owner can delete, not 2ICs
        if (pool.ManagerAuth0Id != managerId)
            return Results.Forbid();

        db.Pools.Remove(pool);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
