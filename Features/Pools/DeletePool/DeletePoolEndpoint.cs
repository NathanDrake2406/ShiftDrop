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

        // Only the pool owner can delete (not 2ICs), so query by owner directly.
        // Returns 404 for both "not found" and "not owner" to avoid leaking existence.
        var pool = await db.Pools
            .FirstOrDefaultAsync(p => p.Id == poolId && p.ManagerAuth0Id == managerId, ct);
        if (pool == null)
            return Results.NotFound();

        db.Pools.Remove(pool);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
