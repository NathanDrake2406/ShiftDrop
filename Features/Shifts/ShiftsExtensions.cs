using ShiftDrop.Features.Shifts.CancelShift;
using ShiftDrop.Features.Shifts.ClaimByToken;
using ShiftDrop.Features.Shifts.ClaimShift;
using ShiftDrop.Features.Shifts.GetAvailableShifts;
using ShiftDrop.Features.Shifts.GetMyShifts;
using ShiftDrop.Features.Shifts.GetShifts;
using ShiftDrop.Features.Shifts.PostShift;
using ShiftDrop.Features.Shifts.ReleaseCasual;
using ShiftDrop.Features.Shifts.ReleaseShift;

namespace ShiftDrop.Features.Shifts;

public static class ShiftsExtensions
{
    public static void MapManagerShiftFeatures(this RouteGroupBuilder group)
    {
        group.MapPostShift();
        group.MapGetShifts();
        group.MapReleaseCasual();
        group.MapCancelShift();
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
