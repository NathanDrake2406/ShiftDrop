using ShiftDrop.Features.Casuals;
using ShiftDrop.Features.PoolAdmins;
using ShiftDrop.Features.Pools;
using ShiftDrop.Features.Shifts;

namespace ShiftDrop.Features;

public static class FeaturesExtensions
{
    public static void MapFeatures(this WebApplication app)
    {
        // Manager endpoints (authenticated, standard rate limit)
        var poolsGroup = app.MapGroup("/pools")
            .RequireAuthorization()
            .RequireRateLimiting("fixed");
        poolsGroup.MapPoolFeatures();
        poolsGroup.MapCasualFeatures();
        poolsGroup.MapManagerShiftFeatures();
        poolsGroup.MapPoolAdminFeatures();

        // Pool admin accept invite (authenticated - any user)
        var adminGroup = app.MapGroup("/pool-admins")
            .RequireAuthorization()
            .RequireRateLimiting("fixed");
        adminGroup.MapAcceptAdminInviteFeature();

        // Casual endpoints (anonymous, strict rate limit)
        var casualGroup = app.MapGroup("/casual")
            .AllowAnonymous()
            .RequireRateLimiting("strict");
        casualGroup.MapAnonymousCasualFeatures(); // verify, opt-out
        casualGroup.MapCasualShiftFeatures();     // shifts, claim-by-token
    }
}
