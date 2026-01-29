using Microsoft.EntityFrameworkCore;

namespace ShiftDrop.Features.Casuals.OptOut;

public static class OptOutEndpoint
{
    public static void MapOptOut(this RouteGroupBuilder group)
    {
        group.MapPost("/opt-out", Handle);
    }

    private static async Task<IResult> Handle(
        OptOutRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        CancellationToken ct)
    {
        var casual = await db.Casuals
            .FirstOrDefaultAsync(c => c.OptOutToken == request.Token && c.RemovedAt == null, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Invalid opt-out token" });

        var result = casual.OptOut(request.Token, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);

        return Results.Ok(new OptOutResponse(
            "You have been unsubscribed from shift notifications."
        ));
    }
}

public record OptOutRequest(string Token);

public record OptOutResponse(string Message);
