using Microsoft.EntityFrameworkCore;

namespace ShiftDrop.Features.Casuals.VerifyInvite;

public static class VerifyInviteEndpoint
{
    public static void MapVerifyInvite(this RouteGroupBuilder group)
    {
        group.MapPost("/verify", Handle);
    }

    private static async Task<IResult> Handle(
        VerifyInviteRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        CancellationToken ct)
    {
        var casual = await db.Casuals
            .Include(c => c.Pool)
            .FirstOrDefaultAsync(c => c.InviteToken == request.Token, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Invalid or expired invite token" });

        var result = casual.AcceptInvite(request.Token, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);

        return Results.Ok(new VerifyInviteResponse(
            casual.Id,
            casual.Name,
            casual.Pool.Name,
            "Phone verified successfully! You'll now receive shift notifications."
        ));
    }
}

public record VerifyInviteRequest(string Token);

public record VerifyInviteResponse(
    Guid CasualId,
    string CasualName,
    string PoolName,
    string Message
);
