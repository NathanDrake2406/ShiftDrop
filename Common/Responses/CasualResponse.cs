using ShiftDrop.Domain;

namespace ShiftDrop.Common.Responses;

public record CasualResponse(
    Guid Id,
    string Name,
    string PhoneNumber,
    string InviteStatus,
    bool IsActive,
    bool IsOptedOut)
{
    public CasualResponse(Casual c) : this(
        c.Id,
        c.Name,
        c.PhoneNumber,
        c.InviteStatus.ToString(),
        c.IsActive,
        c.OptedOutAt.HasValue) { }
}
