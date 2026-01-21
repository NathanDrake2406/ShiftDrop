using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.GetMyShifts;

public static class GetMyShiftsEndpoint
{
    public static void MapGetMyShifts(this RouteGroupBuilder group)
    {
        group.MapGet("/my-shifts", Handle);
    }

    private static async Task<IResult> Handle(
        string phoneNumber,
        AppDbContext db,
        CancellationToken ct)
    {
        var casual = await db.Casuals
            .Include(c => c.Claims)
                .ThenInclude(cl => cl.Shift)
            .FirstOrDefaultAsync(c => c.PhoneNumber == phoneNumber, ct);

        if (casual == null)
            return Results.NotFound(new { error = "Casual not found with this phone number" });

        var claimedShifts = casual.Claims
            .Where(cl => cl.Status == ClaimStatus.Claimed)
            .Select(cl => new ShiftResponse(cl.Shift))
            .ToList();

        return Results.Ok(claimedShifts);
    }
}
