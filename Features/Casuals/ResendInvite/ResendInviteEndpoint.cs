using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Casuals.ResendInvite;

public static class ResendInviteEndpoint
{
    public static void MapResendInvite(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/casuals/{casualId:guid}/resend-invite", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid casualId,
        AppDbContext db,
        TimeProvider timeProvider,
        IConfiguration config,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var casual = await db.Casuals
            .Include(c => c.Pool)
            .FirstOrDefaultAsync(c =>
                c.Id == casualId &&
                c.PoolId == poolId &&
                c.Pool.ManagerAuth0Id == managerId, ct);

        if (casual == null)
            return Results.NotFound();

        var result = casual.RegenerateInviteToken(timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        var baseUrl = config["App:BaseUrl"] ?? "https://shiftdrop.local";

        // Queue invite SMS via outbox
        var payload = new InviteSmsPayload(
            casual.Id,
            casual.PhoneNumber,
            casual.Name,
            casual.Pool.Name,
            $"{baseUrl}/casual/verify/{casual.InviteToken}"
        );
        db.OutboxMessages.Add(OutboxMessage.Create(payload, timeProvider));

        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            message = "Invite resent successfully",
            casual = new CasualResponse(casual)
        });
    }
}
