using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Common.Services;

namespace ShiftDrop.Features.Shifts.PostShift;

public static class PostShiftEndpoint
{
    public static void MapPostShift(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/shifts", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        PostShiftRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        ISmsService smsService,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pool = await db.Pools
            .Include(p => p.Casuals)
            .Include(p => p.Shifts)
            .FirstOrDefaultAsync(p => p.Id == poolId && p.ManagerAuth0Id == managerId, ct);

        if (pool == null)
            return Results.NotFound();

        var result = pool.PostShift(request.StartsAt, request.EndsAt, request.SpotsNeeded, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);
        await smsService.BroadcastShiftAvailable(result.Value!, pool.Casuals);

        return Results.Created(
            $"/pools/{poolId}/shifts/{result.Value!.Id}",
            new ShiftResponse(result.Value!));
    }
}

public record PostShiftRequest(DateTime StartsAt, DateTime EndsAt, int SpotsNeeded);
