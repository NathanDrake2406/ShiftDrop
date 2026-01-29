using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Pools.GetPoolStats;

public static class GetPoolStatsEndpoint
{
    public static void MapGetPoolStats(this RouteGroupBuilder group)
    {
        group.MapGet("/{poolId:guid}/stats", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pool = await db.GetAuthorizedPoolAsync(poolId, managerId, ct, includeCasuals: true, includeShifts: true);
        if (pool == null)
            return Results.NotFound();

        // Load claims separately (extension method doesn't support nested ThenInclude)
        await db.Entry(pool).Collection(p => p.Shifts).Query()
            .Include(s => s.Claims)
            .LoadAsync(ct);

        var stats = CalculateStats(pool);
        return Results.Ok(stats);
    }

    private static PoolStatsResponse CalculateStats(Pool pool)
    {
        var shifts = pool.Shifts.ToList();
        // Exclude soft-deleted casuals from stats
        var casuals = pool.Casuals.Where(c => !c.IsRemoved).ToList();

        var totalShiftsPosted = shifts.Count;
        var shiftsFilled = shifts.Count(s => s.Status == ShiftStatus.Filled);
        var shiftsCancelled = shifts.Count(s => s.Status == ShiftStatus.Cancelled);
        var shiftsOpen = shifts.Count(s => s.Status == ShiftStatus.Open);

        var totalSpotsClaimed = shifts
            .SelectMany(s => s.Claims)
            .Count(c => c.Status == ClaimStatus.Claimed);

        var nonCancelledShifts = totalShiftsPosted - shiftsCancelled;
        var fillRatePercent = nonCancelledShifts > 0
            ? Math.Round((double)shiftsFilled / nonCancelledShifts * 100, 1)
            : 0.0;

        var activeCasuals = casuals.Count(c => c.IsActive);
        var totalCasuals = casuals.Count;

        return new PoolStatsResponse(
            TotalShiftsPosted: totalShiftsPosted,
            ShiftsFilled: shiftsFilled,
            ShiftsCancelled: shiftsCancelled,
            ShiftsOpen: shiftsOpen,
            TotalSpotsClaimed: totalSpotsClaimed,
            FillRatePercent: fillRatePercent,
            ActiveCasuals: activeCasuals,
            TotalCasuals: totalCasuals
        );
    }
}

public record PoolStatsResponse(
    int TotalShiftsPosted,
    int ShiftsFilled,
    int ShiftsCancelled,
    int ShiftsOpen,
    int TotalSpotsClaimed,
    double FillRatePercent,
    int ActiveCasuals,
    int TotalCasuals
);
