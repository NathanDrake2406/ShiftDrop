using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Shifts.ClaimByToken;

public static class ClaimByTokenEndpoint
{
    public static void MapClaimByToken(this RouteGroupBuilder group)
    {
        group.MapPost("/claim/{token}", Handle);
    }

    private static async Task<IResult> Handle(
        string token,
        AppDbContext db,
        TimeProvider timeProvider,
        CancellationToken ct)
    {
        // Find the notification by claim token
        var notification = await db.ShiftNotifications
            .Include(sn => sn.Shift)
                .ThenInclude(s => s.Claims)
            .Include(sn => sn.Casual)
                .ThenInclude(c => c.Claims)
            .FirstOrDefaultAsync(sn => sn.ClaimToken == token, ct);

        if (notification == null)
            return Results.NotFound(new { error = "Invalid claim token" });

        // Check token validity
        if (!notification.IsValid(timeProvider))
        {
            return notification.TokenStatus switch
            {
                TokenStatus.Used => Results.BadRequest(new { error = "This link has already been used" }),
                TokenStatus.Revoked => Results.BadRequest(new { error = "This shift is no longer available" }),
                TokenStatus.Expired => Results.BadRequest(new { error = "This link has expired" }),
                _ => Results.BadRequest(new { error = "This link is no longer valid" })
            };
        }

        var shift = notification.Shift;
        var casual = notification.Casual;

        // Check shift is still claimable
        if (shift.Status == ShiftStatus.Cancelled)
            return Results.BadRequest(new { error = "This shift has been cancelled" });

        if (shift.Status == ShiftStatus.Filled)
            return Results.BadRequest(new { error = "This shift is already filled" });

        // Attempt to claim the shift
        var claimResult = casual.ClaimShift(shift, timeProvider);
        if (claimResult.IsFailure)
            return Results.BadRequest(new { error = claimResult.Error });

        // Mark the token as used
        var tokenResult = notification.MarkAsUsed(timeProvider);
        if (tokenResult.IsFailure)
            return Results.BadRequest(new { error = tokenResult.Error });

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new { error = "Sorry, this shift was just filled. Try another!" });
        }

        return Results.Ok(new ClaimByTokenResponse(
            "Shift claimed successfully!",
            new ShiftResponse(shift),
            casual.Name
        ));
    }
}

public record ClaimByTokenResponse(
    string Message,
    ShiftResponse Shift,
    string CasualName
);
