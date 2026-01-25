using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;

namespace ShiftDrop.Features.PoolAdmins.InviteAdmin;

public static class InviteAdminEndpoint
{
    public static void MapInviteAdmin(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/admins", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        InviteAdminRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
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

        var result = pool.InviteAdmin(request.Email, request.Name, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        var admin = result.Value!;

        await db.SaveChangesAsync(ct);

        return Results.Created(
            $"/pools/{poolId}/admins/{admin.Id}",
            new PoolAdminResponse(admin));
    }
}

public record InviteAdminRequest(string Email, string Name);
