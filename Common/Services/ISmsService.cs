using ShiftDrop.Domain;

namespace ShiftDrop.Common.Services;

public interface ISmsService
{
    Task SendShiftBroadcast(ShiftBroadcastPayload payload, CancellationToken ct);
    Task SendInviteSms(InviteSmsPayload payload, CancellationToken ct);
    Task SendAdminInviteSms(AdminInviteSmsPayload payload, CancellationToken ct);
    Task SendClaimConfirmation(ClaimConfirmationPayload payload, CancellationToken ct);
    Task SendShiftReopened(ShiftReopenedPayload payload, CancellationToken ct);
}
