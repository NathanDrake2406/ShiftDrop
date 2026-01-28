using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.GetAvailableShifts;

public static class GetAvailableShiftsEndpoint
{
    public static void MapGetAvailableShifts(this RouteGroupBuilder group)
    {
        group.MapGet("/shifts", Handle);
    }

    private static async Task<IResult> Handle(
        string phoneNumber,
        AppDbContext db,
        TimeProvider timeProvider,
        CancellationToken ct)
    {
        var phoneResult = PhoneNumber.Parse(phoneNumber);
        if (phoneResult.IsFailure)
            return Results.BadRequest(new { error = phoneResult.Error });

        var parsedPhone = phoneResult.Value;
        var casual = await db.Casuals
            .Include(c => c.Pool)
            .Include(c => c.Claims)
            .FirstOrDefaultAsync(c => c.PhoneNumber == parsedPhone, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Casual not found with this phone number" });

        var now = timeProvider.GetUtcNow().UtcDateTime;

        // Get IDs of shifts this casual has already claimed
        var claimedShiftIds = casual.Claims
            .Where(c => c.Status == ClaimStatus.Claimed)
            .Select(c => c.ShiftId)
            .ToHashSet();

        var shifts = await db.Shifts
            .Where(s => s.PoolId == casual.PoolId
                && s.Status == ShiftStatus.Open
                && s.StartsAt > now)  // Exclude past shifts
            .OrderBy(s => s.StartsAt)
            .ToListAsync(ct);

        // Filter out shifts the casual already claimed (in memory since we have the IDs)
        var availableShifts = shifts
            .Where(s => !claimedShiftIds.Contains(s.Id))
            .ToList();

        return Results.Ok(new
        {
            casual = new CasualResponse(casual),
            availableShifts = availableShifts.Select(s => new ShiftResponse(s))
        });
    }
}
