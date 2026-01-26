using ShiftDrop.Domain;

namespace ShiftDrop.Common.Responses;

public record PoolAdminResponse(
    Guid Id,
    string PhoneNumber,
    string Name,
    DateTime InvitedAt,
    DateTime? AcceptedAt,
    bool IsAccepted)
{
    public PoolAdminResponse(PoolAdmin admin) : this(
        admin.Id,
        admin.PhoneNumber,
        admin.Name,
        admin.InvitedAt,
        admin.AcceptedAt,
        admin.IsAccepted)
    { }
}
