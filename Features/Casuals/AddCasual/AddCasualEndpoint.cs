using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ShiftDrop.Common;
using ShiftDrop.Common.Responses;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Casuals.AddCasual;

public static class AddCasualEndpoint
{
    public static void MapAddCasual(this RouteGroupBuilder group)
    {
        group.MapPost("/{poolId:guid}/casuals", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        AddCasualRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        IConfiguration config,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var pool = await db.GetAuthorizedPoolAsync(poolId, managerId, ct, includeCasuals: true);
        if (pool == null)
            return Results.NotFound();

        var result = pool.AddCasual(request.Name, request.PhoneNumber, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        var casual = result.Value!;
        var baseUrl = config["App:BaseUrl"] ?? "https://shiftdrop.local";

        // Queue invite SMS via outbox
        var payload = new InviteSmsPayload(
            casual.Id,
            casual.PhoneNumber,
            casual.Name,
            pool.Name,
            $"{baseUrl}/casual/verify/{casual.InviteToken}"
        );
        db.OutboxMessages.Add(OutboxMessage.Create(payload, timeProvider));

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsDuplicateKeyViolation(ex))
        {
            return Results.Conflict(new { error = "A casual with this phone number already exists in this pool" });
        }

        return Results.Created(
            $"/pools/{poolId}/casuals/{casual.Id}",
            new CasualResponse(casual));
    }
    /// <summary>
    /// Checks if the exception is a unique constraint violation.
    /// SQL Server uses error 2627 (unique constraint) or 2601 (unique index).
    /// </summary>
    private static bool IsDuplicateKeyViolation(DbUpdateException ex)
    {
        // Check for SQL Server unique constraint/index violation
        if (ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlEx)
        {
            return sqlEx.Number == 2627 || sqlEx.Number == 2601;
        }
        // Fallback: check message content
        return ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) ?? false;
    }
}

public record AddCasualRequest(string Name, string PhoneNumber);
