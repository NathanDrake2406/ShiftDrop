using System.Security.Claims;
using ShiftDrop.Common;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Casuals.SetAvailability;

public static class SetAvailabilityEndpoint
{
    public static void MapSetAvailability(this RouteGroupBuilder group)
    {
        group.MapPut("/{poolId:guid}/casuals/{casualId:guid}/availability", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid casualId,
        SetAvailabilityRequest request,
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Results.Unauthorized();

        var pool = await db.GetAuthorizedPoolAsync(poolId, userId, ct, includeCasuals: true, includeCasualAvailability: true);
        if (pool == null)
            return Results.NotFound();

        var casual = pool.Casuals.FirstOrDefault(c => c.Id == casualId);
        if (casual == null)
            return Results.NotFound(new { error = "Casual not found" });

        // Remove existing availability
        db.CasualAvailability.RemoveRange(casual.Availability);

        // Create new availability records
        var newAvailability = new List<CasualAvailability>();
        foreach (var slot in request.Availability)
        {
            if (!TimeOnly.TryParse(slot.FromTime, out var fromTime))
                return Results.BadRequest(new { error = $"Invalid from time: {slot.FromTime}" });

            if (!TimeOnly.TryParse(slot.ToTime, out var toTime))
                return Results.BadRequest(new { error = $"Invalid to time: {slot.ToTime}" });

            var result = CasualAvailability.Create(
                casual,
                (DayOfWeek)slot.DayOfWeek,
                fromTime,
                toTime);

            if (result.IsFailure)
                return Results.BadRequest(new { error = result.Error });

            newAvailability.Add(result.Value!);
        }

        casual.SetAvailability(newAvailability);
        db.CasualAvailability.AddRange(newAvailability);

        await db.SaveChangesAsync(ct);

        return Results.Ok(newAvailability
            .OrderBy(a => a.DayOfWeek)
            .Select(a => new AvailabilityResponse(
                (int)a.DayOfWeek,
                a.FromTime.ToString("HH:mm"),
                a.ToTime.ToString("HH:mm")))
            .ToList());
    }
}

public record SetAvailabilityRequest(List<AvailabilitySlot> Availability);
public record AvailabilitySlot(int DayOfWeek, string FromTime, string ToTime);
public record AvailabilityResponse(int DayOfWeek, string FromTime, string ToTime);
