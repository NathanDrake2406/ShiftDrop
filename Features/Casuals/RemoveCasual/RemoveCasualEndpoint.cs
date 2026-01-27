using System.Security.Claims;
using ShiftDrop.Common;

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

        var pool = await db.GetAuthorizedPoolAsync(poolId, managerId, ct, includeCasuals: true);
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
