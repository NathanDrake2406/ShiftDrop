using ShiftDrop.Domain;

namespace ShiftDrop.Common.Services;

public interface ISmsService
{
    // Legacy methods (will be deprecated once outbox migration is complete)
    Task BroadcastShiftAvailable(Shift shift, IEnumerable<Casual> casuals);
    Task NotifyShiftClaimed(Shift shift, Casual casual);

    // Outbox-based methods - process individual messages
    Task SendShiftBroadcast(ShiftBroadcastPayload payload, CancellationToken ct);
    Task SendInviteSms(InviteSmsPayload payload, CancellationToken ct);
    Task SendAdminInviteSms(AdminInviteSmsPayload payload, CancellationToken ct);
    Task SendClaimConfirmation(ClaimConfirmationPayload payload, CancellationToken ct);
}
