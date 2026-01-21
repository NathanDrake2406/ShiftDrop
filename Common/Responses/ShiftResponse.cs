using ShiftDrop.Domain;

namespace ShiftDrop.Common.Responses;

public record ShiftResponse(Guid Id, DateTime StartsAt, DateTime EndsAt, int SpotsNeeded, int SpotsRemaining, string Status)
{
    public ShiftResponse(Shift s) : this(s.Id, s.StartsAt, s.EndsAt, s.SpotsNeeded, s.SpotsRemaining, s.Status.ToString()) { }
}

public record ShiftDetailResponse(
    Guid Id,
    DateTime StartsAt,
    DateTime EndsAt,
    int SpotsNeeded,
    int SpotsRemaining,
    string Status,
    List<ClaimResponse> Claims)
{
    public ShiftDetailResponse(Shift s) : this(
        s.Id, s.StartsAt, s.EndsAt, s.SpotsNeeded, s.SpotsRemaining, s.Status.ToString(),
        s.Claims.Select(c => new ClaimResponse(c)).ToList()) { }
}

public record ClaimResponse(Guid CasualId, string CasualName, string Status, DateTime ClaimedAt)
{
    public ClaimResponse(ShiftClaim c) : this(c.CasualId, c.Casual.Name, c.Status.ToString(), c.ClaimedAt) { }
}
