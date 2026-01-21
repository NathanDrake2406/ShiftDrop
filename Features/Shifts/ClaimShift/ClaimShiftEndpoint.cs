using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Common.Services;

namespace ShiftDrop.Features.Shifts.ClaimShift;

public static class ClaimShiftEndpoint
{
    public static void MapClaimShift(this RouteGroupBuilder group)
    {
        group.MapPost("/shifts/{shiftId:guid}/claim", Handle);
    }

    private static async Task<IResult> Handle(
        Guid shiftId,
        ClaimShiftRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        ISmsService smsService,
        CancellationToken ct)
    {
        var casual = await db.Casuals
            .Include(c => c.Claims)
            .FirstOrDefaultAsync(c => c.PhoneNumber == request.PhoneNumber, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Casual not found with this phone number" });

        var shift = await db.Shifts
            .Include(s => s.Claims)
            .FirstOrDefaultAsync(s => s.Id == shiftId && s.PoolId == casual.PoolId, ct);

        if (shift == null)
            return Results.NotFound(new { error = "Shift not found or not in your pool" });

        var result = casual.ClaimShift(shift, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new { error = "Sorry, this shift was just filled. Try another!" });
        }

        await smsService.NotifyShiftClaimed(shift, casual);

        return Results.Ok(new
        {
            message = "Shift claimed successfully!",
            shift = new ShiftResponse(shift)
        });
    }
}

public record ClaimShiftRequest(string PhoneNumber);
