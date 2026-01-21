using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace ShiftDrop.Features.Casuals.RemoveCasual;

public static class RemoveCasualEndpoint
{
    public static void MapRemoveCasual(this RouteGroupBuilder group)
    {
        group.MapDelete("/{poolId:guid}/casuals/{casualId:guid}", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid casualId,
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pool = await db.Pools
            .Include(p => p.Casuals)
            .FirstOrDefaultAsync(p => p.Id == poolId && p.ManagerAuth0Id == managerId, ct);

        if (pool == null)
            return Results.NotFound();

        var casual = pool.Casuals.FirstOrDefault(c => c.Id == casualId);
        if (casual == null)
            return Results.NotFound();

        pool.RemoveCasual(casual);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
