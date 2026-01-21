using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Common.Services;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.ReleaseCasual;

public static class ReleaseCasualEndpoint
{
    public static void MapReleaseCasual(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/shifts/{shiftId:guid}/release/{casualId:guid}", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid shiftId,
        Guid casualId,
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
            .FirstOrDefaultAsync(p => p.Id == poolId && p.ManagerAuth0Id == managerId, ct);

        if (pool == null)
            return Results.NotFound();

        var shift = await db.Shifts
            .Include(s => s.Claims)
                .ThenInclude(c => c.Casual)
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.PoolId == poolId, ct);

        if (shift == null)
            return Results.NotFound();

        var casual = pool.Casuals.FirstOrDefault(c => c.Id == casualId);
        if (casual == null)
            return Results.NotFound();

        var result = shift.ManagerReleaseCasual(casual, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);

        var availableCasuals = pool.Casuals
            .Where(c => !shift.Claims.Any(cl => cl.CasualId == c.Id && cl.Status == ClaimStatus.Claimed))
            .ToList();

        await smsService.BroadcastShiftAvailable(shift, availableCasuals);

        return Results.Ok(new ShiftDetailResponse(shift));
    }
}
