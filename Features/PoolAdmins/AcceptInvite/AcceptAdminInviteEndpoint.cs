using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace ShiftDrop.Features.PoolAdmins.AcceptInvite;

public static class AcceptAdminInviteEndpoint
{
    public static void MapAcceptAdminInvite(this RouteGroupBuilder group)
    {
        group.MapPost("/accept/{token}", Handle);
    }

    private static async Task<IResult> Handle(
        string token,
        AppDbContext db,
        TimeProvider timeProvider,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var auth0Id = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(auth0Id))
            return Results.Unauthorized();

        var admin = await db.PoolAdmins
            .Include(a => a.Pool)
            .FirstOrDefaultAsync(a => a.InviteToken == token, ct);

        if (admin == null)
            return Results.NotFound(new { error = "Invalid or expired invite token" });

        var result = admin.AcceptInvite(auth0Id, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            poolName = admin.Pool.Name,
            message = $"You are now an admin of {admin.Pool.Name}"
        });
    }
}
