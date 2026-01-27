using Microsoft.EntityFrameworkCore;
using ShiftDrop.Domain;

namespace ShiftDrop.Common;

/// <summary>
/// Extension methods for secure multi-tenant data access.
/// These methods ensure authorization is checked at the query level,
/// returning null for unauthorized resources (404) rather than revealing
/// their existence (403).
/// </summary>
public static class DbContextExtensions
{
    /// <summary>
    /// Gets a pool by ID only if the user is authorized (owner or accepted admin).
    /// Returns null if pool doesn't exist OR user isn't authorized - preventing
    /// information disclosure about resource existence.
    /// </summary>
    public static async Task<Pool?> GetAuthorizedPoolAsync(
        this AppDbContext db,
        Guid poolId,
        string managerId,
        CancellationToken ct,
        bool includeCasuals = false,
        bool includeShifts = false,
        bool includeAdmins = true,
        bool includeCasualAvailability = false)
    {
        IQueryable<Pool> query = db.Pools;

        // Always include admins for authorization check
        query = query.Include(p => p.Admins);

        if (includeCasuals && includeCasualAvailability)
        {
            query = query.Include(p => p.Casuals).ThenInclude(c => c.Availability);
        }
        else if (includeCasuals)
        {
            query = query.Include(p => p.Casuals);
        }

        if (includeShifts)
        {
            query = query.Include(p => p.Shifts);
        }

        // Key security fix: Filter by authorization in the query itself.
        // If pool exists but user isn't authorized, this returns null (404)
        // rather than finding it and returning 403 (which leaks existence).
        // Note: We use AcceptedAt.HasValue instead of IsAccepted because EF Core
        // can't translate computed properties to SQL.
        return await query.FirstOrDefaultAsync(p =>
            p.Id == poolId &&
            (p.ManagerAuth0Id == managerId || p.Admins.Any(a => a.AcceptedAt.HasValue && a.Auth0Id == managerId)),
            ct);
    }
}
