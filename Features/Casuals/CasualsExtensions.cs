using ShiftDrop.Features.Casuals.AddCasual;
using ShiftDrop.Features.Casuals.RemoveCasual;

namespace ShiftDrop.Features.Casuals;

public static class CasualsExtensions
{
    public static void MapCasualFeatures(this RouteGroupBuilder group)
    {
        group.MapAddCasual();
        group.MapRemoveCasual();
    }
}
