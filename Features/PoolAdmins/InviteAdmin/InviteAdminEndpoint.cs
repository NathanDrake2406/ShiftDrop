using System.Security.Claims;
using ShiftDrop.Common;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.PoolAdmins.InviteAdmin;

public static class InviteAdminEndpoint
{
    public static void MapInviteAdmin(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/admins", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        InviteAdminRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        IConfiguration config,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Results.Unauthorized();

        var pool = await db.GetAuthorizedPoolAsync(poolId, userId, ct);
        if (pool == null)
            return Results.NotFound();

        var result = pool.InviteAdmin(request.PhoneNumber, request.Name, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        var admin = result.Value!;
        var baseUrl = config["App:BaseUrl"] ?? "https://shiftdrop.local";

        var payload = new AdminInviteSmsPayload(
            admin.Id,
            admin.PhoneNumber,
            admin.Name,
            pool.Name,
            $"{baseUrl}/admin/accept/{admin.InviteToken}"
        );
        db.OutboxMessages.Add(OutboxMessage.Create(payload, timeProvider));

        await db.SaveChangesAsync(ct);

        return Results.Created(
            $"/pools/{poolId}/admins/{admin.Id}",
            new PoolAdminResponse(admin));
    }
}

public record InviteAdminRequest(string PhoneNumber, string Name);
