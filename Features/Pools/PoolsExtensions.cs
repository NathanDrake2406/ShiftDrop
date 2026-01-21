using ShiftDrop.Features.Pools.CreatePool;
using ShiftDrop.Features.Pools.GetPool;
using ShiftDrop.Features.Pools.GetPools;

namespace ShiftDrop.Features.Pools;

public static class PoolsExtensions
{
    public static void MapPoolFeatures(this RouteGroupBuilder group)
    {
        group.MapCreatePool();
        group.MapGetPools();
        group.MapGetPool();
    }
}
