using System.Security.Claims;
using ShiftDrop.Domain;

namespace ShiftDrop.Features.Pools.CreatePool;

public static class CreatePoolEndpoint
{
    public static void MapCreatePool(this RouteGroupBuilder group)
    {
        group.MapPost("/", Handle);
    }

    private static async Task<IResult> Handle(
        CreatePoolRequest request,
        AppDbContext db,
        TimeProvider timeProvider,
        ClaimsPrincipal user,
        CancellationToken ct)
    {
        var managerId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(managerId))
            return Results.Unauthorized();

        var result = Pool.Create(request.Name, managerId, timeProvider);
        if (result.IsFailure)
            return Results.BadRequest(new { error = result.Error });

        db.Pools.Add(result.Value!);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/pools/{result.Value!.Id}", new CreatePoolResponse(result.Value!));
    }
}

public record CreatePoolRequest(string Name);

public record CreatePoolResponse(Guid Id, string Name, DateTime CreatedAt)
{
    public CreatePoolResponse(Pool p) : this(p.Id, p.Name, p.CreatedAt) { }
}
