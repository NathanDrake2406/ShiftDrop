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

        var shifts = await db.Shifts
            .Where(s => s.PoolId == casual.PoolId && s.Status == ShiftStatus.Open)
            .OrderBy(s => s.StartsAt)
            .ToListAsync(ct);

        return Results.Ok(new
        {
            casual = new CasualResponse(casual),
            availableShifts = shifts.Select(s => new ShiftResponse(s))
        });
    }
}
