using ShiftDrop.Domain;

namespace ShiftDrop.Common.Services;

public interface ISmsService
{
    Task BroadcastShiftAvailable(Shift shift, IEnumerable<Casual> casuals);
    Task NotifyShiftClaimed(Shift shift, Casual casual);
}
