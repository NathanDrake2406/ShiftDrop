using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace ShiftDrop.Features.PoolAdmins.RemoveAdmin;

public static class RemoveAdminEndpoint
{
    public static void MapRemoveAdmin(this RouteGroupBuilder group)
    {
        group.MapDelete("/{poolId:guid}/admins/{adminId:guid}", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid adminId,
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Results.Unauthorized();

        var pool = await db.Pools
            .Include(p => p.Admins)
            .FirstOrDefaultAsync(p => p.Id == poolId, ct);

        if (pool == null)
            return Results.NotFound();

        if (!pool.IsAuthorized(userId))
            return Results.Forbid();

        var result = pool.RemoveAdmin(adminId);
        if (result.IsFailure)
            return Results.NotFound(new { error = result.Error });

        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
