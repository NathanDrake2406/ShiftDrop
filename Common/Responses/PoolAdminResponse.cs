using ShiftDrop.Domain;

namespace ShiftDrop.Common.Responses;

public record PoolAdminResponse(
    Guid Id,
    string Email,
    string Name,
    DateTime InvitedAt,
    DateTime? AcceptedAt,
    bool IsAccepted)
{
    public PoolAdminResponse(PoolAdmin admin) : this(
        admin.Id,
        admin.Email,
        admin.Name,
        admin.InvitedAt,
        admin.AcceptedAt,
        admin.IsAccepted)
    { }
}
