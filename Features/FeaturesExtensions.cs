using ShiftDrop.Features.Casuals;
using ShiftDrop.Features.PoolAdmins;
using ShiftDrop.Features.Pools;
using ShiftDrop.Features.Shifts;

namespace ShiftDrop.Features;

public static class FeaturesExtensions
{
    public static void MapFeatures(this WebApplication app)
    {
        // Manager endpoints (authenticated)
        var poolsGroup = app.MapGroup("/pools").RequireAuthorization();
        poolsGroup.MapPoolFeatures();
        poolsGroup.MapCasualFeatures();
        poolsGroup.MapManagerShiftFeatures();
        poolsGroup.MapPoolAdminFeatures();

        // Pool admin accept invite (authenticated - any user)
        var adminGroup = app.MapGroup("/pool-admins").RequireAuthorization();
        adminGroup.MapAcceptAdminInviteFeature();

        // Casual endpoints (anonymous)
        var casualGroup = app.MapGroup("/casual").AllowAnonymous();
        casualGroup.MapAnonymousCasualFeatures(); // verify, opt-out
        casualGroup.MapCasualShiftFeatures();     // shifts, claim-by-token
    }
}
