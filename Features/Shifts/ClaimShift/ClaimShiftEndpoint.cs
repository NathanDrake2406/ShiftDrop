using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;
using TimeZoneConverter;

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
        CancellationToken ct)
    {
        var phoneResult = PhoneNumber.Parse(request.PhoneNumber);
        if (phoneResult.IsFailure)
            return Results.BadRequest(new { error = phoneResult.Error });

        var phoneNumber = phoneResult.Value;
        var casual = await db.Casuals
            .Include(c => c.Claims)
            .FirstOrDefaultAsync(c => c.PhoneNumber == phoneNumber && c.RemovedAt == null, ct);

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

        var claim = result.Value!;

        // Queue SMS confirmation via outbox (same transaction as the claim)
        var shiftDescription = FormatShiftDescription(shift);
        var payload = new ClaimConfirmationPayload(claim.Id, casual.PhoneNumber, shiftDescription);
        db.OutboxMessages.Add(OutboxMessage.Create(payload, timeProvider));

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new { error = "Sorry, this shift was just filled. Try another!" });
        }

        return Results.Ok(new
        {
            message = "Shift claimed successfully!",
            shift = new ShiftResponse(shift)
        });
    }

    private static string FormatShiftDescription(Shift shift)
    {
        // TZConvert handles cross-platform IANA/Windows timezone ID differences
        var aest = TZConvert.GetTimeZoneInfo("Australia/Sydney");
        var utcStart = DateTime.SpecifyKind(shift.StartsAt, DateTimeKind.Utc);
        var utcEnd = DateTime.SpecifyKind(shift.EndsAt, DateTimeKind.Utc);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(utcStart, aest);
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(utcEnd, aest);
        return $"{localStart:ddd d MMM, h:mmtt} - {localEnd:h:mmtt}";
    }
}

public record ClaimShiftRequest(string PhoneNumber);
