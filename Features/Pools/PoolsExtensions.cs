using ShiftDrop.Features.Pools.CreatePool;
using ShiftDrop.Features.Pools.DeletePool;
using ShiftDrop.Features.Pools.GetPool;
using ShiftDrop.Features.Pools.GetPools;
using ShiftDrop.Features.Pools.GetPoolStats;

namespace ShiftDrop.Features.Pools;

public static class PoolsExtensions
{
    public static void MapPoolFeatures(this RouteGroupBuilder group)
    {
        group.MapCreatePool();
        group.MapGetPools();
        group.MapGetPool();
        group.MapGetPoolStats();
        group.MapDeletePool();
    }
}
