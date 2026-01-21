using ShiftDrop.Domain;

namespace ShiftDrop.Common.Responses;

public record CasualResponse(Guid Id, string Name, string PhoneNumber)
{
    public CasualResponse(Casual c) : this(c.Id, c.Name, c.PhoneNumber) { }
}
