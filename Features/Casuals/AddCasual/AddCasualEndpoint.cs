using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;

namespace ShiftDrop.Features.Casuals.AddCasual;

public static class AddCasualEndpoint
{
    public static void MapAddCasual(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/casuals", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        AddCasualRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
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

        var result = pool.AddCasual(request.Name, request.PhoneNumber, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);

        return Results.Created(
            $"/pools/{poolId}/casuals/{result.Value!.Id}",
            new CasualResponse(result.Value!));
    }
}

public record AddCasualRequest(string Name, string PhoneNumber);
