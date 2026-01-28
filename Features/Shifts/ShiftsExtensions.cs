using ShiftDrop.Features.Shifts.CancelShift;
using ShiftDrop.Features.Shifts.ClaimByToken;
using ShiftDrop.Features.Shifts.ClaimShift;
using ShiftDrop.Features.Shifts.GetAvailableShifts;
using ShiftDrop.Features.Shifts.GetMyShifts;
using ShiftDrop.Features.Shifts.GetShifts;
using ShiftDrop.Features.Shifts.PostShift;
using ShiftDrop.Features.Shifts.ReleaseCasual;
using ShiftDrop.Features.Shifts.ReleaseShift;
using ShiftDrop.Features.Shifts.ResendShiftNotification;

namespace ShiftDrop.Features.Shifts;

public static class ShiftsExtensions
{
    public static void MapManagerShiftFeatures(this RouteGroupBuilder group)
    {
        group.MapPostShift().RequireRateLimiting("sms-send");
        group.MapGetShifts();
        group.MapReleaseCasual();
        group.MapCancelShift();
        group.MapResendShiftNotification().RequireRateLimiting("sms-send");
    }

    public static void MapCasualShiftFeatures(this RouteGroupBuilder group)
    {
        group.MapGetAvailableShifts();
        group.MapClaimShift();
        group.MapClaimByToken(); // SMS link one-click claim
        group.MapReleaseShift();
        group.MapGetMyShifts();
    }
}
