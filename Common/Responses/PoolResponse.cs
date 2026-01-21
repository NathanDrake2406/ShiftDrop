using ShiftDrop.Domain;

namespace ShiftDrop.Common.Responses;

public record PoolResponse(Guid Id, string Name, DateTime CreatedAt)
{
    public PoolResponse(Pool p) : this(p.Id, p.Name, p.CreatedAt) { }
}

public record PoolDetailResponse(Guid Id, string Name, DateTime CreatedAt, List<CasualResponse> Casuals)
{
    public PoolDetailResponse(Pool p) : this(p.Id, p.Name, p.CreatedAt, p.Casuals.Select(c => new CasualResponse(c)).ToList()) { }
}
