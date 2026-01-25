using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace ShiftDrop.Features.Casuals.GetAvailability;

public static class GetAvailabilityEndpoint
{
    public static void MapGetAvailability(this RouteGroupBuilder group)
    {
        group.MapGet("/{poolId:guid}/casuals/{casualId:guid}/availability", Handle);
    }

    private static async Task<IResult> Handle(
        Guid poolId,
        Guid casualId,
        AppDbContext db,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Results.Unauthorized();

        var pool = await db.Pools
            .Include(p => p.Admins)
            .Include(p => p.Casuals)
                .ThenInclude(c => c.Availability)
            .FirstOrDefaultAsync(p => p.Id == poolId, ct);

        if (pool == null)
            return Results.NotFound();

        if (!pool.IsAuthorized(userId))
            return Results.Forbid();

        var casual = pool.Casuals.FirstOrDefault(c => c.Id == casualId);
        if (casual == null)
            return Results.NotFound(new { error = "Casual not found" });

        var availability = casual.Availability
            .OrderBy(a => a.DayOfWeek)
            .Select(a => new AvailabilityResponse(
                (int)a.DayOfWeek,
                a.FromTime.ToString("HH:mm"),
                a.ToTime.ToString("HH:mm")))
            .ToList();

        return Results.Ok(availability);
    }
}

public record AvailabilityResponse(int DayOfWeek, string FromTime, string ToTime);
