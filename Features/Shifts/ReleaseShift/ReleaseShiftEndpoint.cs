using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Common.Services;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.ReleaseShift;

public static class ReleaseShiftEndpoint
{
    public static void MapReleaseShift(this RouteGroupBuilder group)
    {
        group.MapPost("/shifts/{shiftId:guid}/release", Handle);
    }

    private static async Task<IResult> Handle(
        Guid shiftId,
        ReleaseShiftRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        ISmsService smsService,
        CancellationToken ct)
    {
        var casual = await db.Casuals
            .Include(c => c.Claims)
            .Include(c => c.Pool)
                .ThenInclude(p => p.Casuals)
            .FirstOrDefaultAsync(c => c.PhoneNumber == request.PhoneNumber, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Casual not found with this phone number" });

        var shift = await db.Shifts
            .Include(s => s.Claims)
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.PoolId == casual.PoolId, ct);

        if (shift == null)
            return Results.NotFound(new { error = "Shift not found or not in your pool" });

        var result = casual.ReleaseShift(shift, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        await db.SaveChangesAsync(ct);

        var availableCasuals = casual.Pool.Casuals
            .Where(c => !shift.Claims.Any(cl => cl.CasualId == c.Id && cl.Status == ClaimStatus.Claimed))
            .ToList();

        await smsService.BroadcastShiftAvailable(shift, availableCasuals);

        return Results.Ok(new { message = "You've been released from this shift." });
    }
}

public record ReleaseShiftRequest(string PhoneNumber);
