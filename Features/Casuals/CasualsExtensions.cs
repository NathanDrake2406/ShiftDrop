using ShiftDrop.Features.Casuals.AddCasual;
using ShiftDrop.Features.Casuals.GetAvailability;
using ShiftDrop.Features.Casuals.OptOut;
using ShiftDrop.Features.Casuals.RemoveCasual;
using ShiftDrop.Features.Casuals.ResendInvite;
using ShiftDrop.Features.Casuals.SetAvailability;
using ShiftDrop.Features.Casuals.VerifyInvite;

namespace ShiftDrop.Features.Casuals;

public static class CasualsExtensions
{
    /// <summary>
    /// Manager endpoints for managing casuals in a pool (requires authorization).
    /// Mounted under /pools/{poolId}/casuals
    /// </summary>
    public static void MapCasualFeatures(this RouteGroupBuilder group)
    {
        group.MapAddCasual();
        group.MapRemoveCasual();
        group.MapResendInvite();
        group.MapGetAvailability();
        group.MapSetAvailability();
    }

    /// <summary>
    /// Anonymous casual endpoints for self-service actions (no auth required).
    /// Mounted under /casual
    /// </summary>
    public static void MapAnonymousCasualFeatures(this RouteGroupBuilder group)
    {
        group.MapVerifyInvite();
        group.MapOptOut();
    }
}
