using ShiftDrop.Features.PoolAdmins.AcceptInvite;
using ShiftDrop.Features.PoolAdmins.InviteAdmin;
using ShiftDrop.Features.PoolAdmins.ListAdmins;
using ShiftDrop.Features.PoolAdmins.RemoveAdmin;

namespace ShiftDrop.Features.PoolAdmins;

public static class PoolAdminsExtensions
{
    /// <summary>
    /// Pool admin management endpoints (requires authorization).
    /// Mounted under /pools/{poolId}/admins
    /// </summary>
    public static void MapPoolAdminFeatures(this RouteGroupBuilder group)
    {
        group.MapInviteAdmin();
        group.MapListAdmins();
        group.MapRemoveAdmin();
    }

    /// <summary>
    /// Accept admin invite endpoint (requires authorization - any authenticated user).
    /// Mounted under /pool-admins
    /// </summary>
    public static void MapAcceptAdminInviteFeature(this RouteGroupBuilder group)
    {
        group.MapAcceptAdminInvite();
    }
}
