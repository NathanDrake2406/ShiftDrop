using ShiftDrop.Features.Casuals;
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

        // Casual endpoints (anonymous)
        var casualGroup = app.MapGroup("/casual").AllowAnonymous();
        casualGroup.MapCasualShiftFeatures();
    }
}
