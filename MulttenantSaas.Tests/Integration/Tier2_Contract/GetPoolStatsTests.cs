using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Integration.Tier2_Contract;

/// <summary>
/// HTTP contract tests for the GET /pools/{poolId}/stats endpoint.
/// </summary>
public class GetPoolStatsTests : IntegrationTestBase
{
    private const string ManagerId = "auth0|manager-stats";

    public GetPoolStatsTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetPoolStats_WithVariousShiftStates_ReturnsCorrectStats()
    {
        // Arrange: Create a pool with mixed shift states
        var scenario = await SeedScenarioAsync(ManagerId, "Stats Pool", casualCount: 3, activateCasuals: true);
        var client = CreateAuthenticatedClient(ManagerId);

        // Create 3 shifts with different states:
        // 1. Filled shift (2 spots, both claimed)
        // 2. Open shift with partial claims (3 spots, 1 claimed)
        // 3. Cancelled shift
        await ExecuteDbAsync(async db =>
        {
            var pool = await db.Pools.FindAsync(scenario.Pool.Id);

            // Shift 1: Filled (2 spots, 2 claims)
            var shift1Result = pool!.PostShift(
                TimeProvider.GetUtcNow().UtcDateTime.AddDays(1),
                TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(4),
                2,
                TimeProvider);
            var shift1 = shift1Result.Value!;

            // Shift 2: Open with 1 claim (3 spots, 1 claimed)
            var shift2Result = pool.PostShift(
                TimeProvider.GetUtcNow().UtcDateTime.AddDays(2),
                TimeProvider.GetUtcNow().UtcDateTime.AddDays(2).AddHours(4),
                3,
                TimeProvider);
            var shift2 = shift2Result.Value!;

            // Shift 3: Cancelled
            var shift3Result = pool.PostShift(
                TimeProvider.GetUtcNow().UtcDateTime.AddDays(3),
                TimeProvider.GetUtcNow().UtcDateTime.AddDays(3).AddHours(4),
                2,
                TimeProvider);
            var shift3 = shift3Result.Value!;
            shift3.Cancel();

            await db.SaveChangesAsync();

            // Reload casuals from database to ensure they're tracked
            var casuals = db.Casuals.Where(c => c.PoolId == pool.Id).ToList();

            // Create claims for shift1 (fill it - 2 claims)
            shift1.AcceptClaim(casuals[0], TimeProvider);
            shift1.AcceptClaim(casuals[1], TimeProvider);

            // Create claim for shift2 (partial - 1 claim)
            shift2.AcceptClaim(casuals[2], TimeProvider);

            await db.SaveChangesAsync();
        });

        // Act
        var response = await client.GetAsync($"/pools/{scenario.Pool.Id}/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var stats = await response.Content.ReadFromJsonAsync<PoolStatsResponse>();
        stats.Should().NotBeNull();

        // Total shifts: 3 (1 filled + 1 open + 1 cancelled)
        stats!.TotalShiftsPosted.Should().Be(3);

        // Shifts by status
        stats.ShiftsFilled.Should().Be(1);
        stats.ShiftsOpen.Should().Be(1);
        stats.ShiftsCancelled.Should().Be(1);

        // Total spots claimed: 3 (2 on filled shift + 1 on open shift)
        stats.TotalSpotsClaimed.Should().Be(3);

        // Fill rate: 1 filled / 2 non-cancelled = 50%
        stats.FillRatePercent.Should().Be(50.0);

        // Casuals: 3 active, 3 total
        stats.ActiveCasuals.Should().Be(3);
        stats.TotalCasuals.Should().Be(3);
    }

    [Fact]
    public async Task GetPoolStats_WhenPoolNotFound_Returns404()
    {
        // Arrange
        var client = CreateAuthenticatedClient(ManagerId);
        var nonExistentPoolId = Guid.NewGuid();

        // Act
        var response = await client.GetAsync($"/pools/{nonExistentPoolId}/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPoolStats_WhenNotAuthorized_Returns403()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, "Stats Pool");
        var otherManagerClient = CreateAuthenticatedClient("auth0|other-manager");

        // Act
        var response = await otherManagerClient.GetAsync($"/pools/{scenario.Pool.Id}/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetPoolStats_WithNoShifts_ReturnsZeroStats()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, "Empty Pool", casualCount: 2, activateCasuals: false);
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.GetAsync($"/pools/{scenario.Pool.Id}/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var stats = await response.Content.ReadFromJsonAsync<PoolStatsResponse>();
        stats.Should().NotBeNull();
        stats!.TotalShiftsPosted.Should().Be(0);
        stats.ShiftsFilled.Should().Be(0);
        stats.ShiftsOpen.Should().Be(0);
        stats.ShiftsCancelled.Should().Be(0);
        stats.TotalSpotsClaimed.Should().Be(0);
        stats.FillRatePercent.Should().Be(0.0);
        stats.ActiveCasuals.Should().Be(0);
        stats.TotalCasuals.Should().Be(2);
    }

    // DTO for JSON deserialization
    private record PoolStatsResponse(
        int TotalShiftsPosted,
        int ShiftsFilled,
        int ShiftsCancelled,
        int ShiftsOpen,
        int TotalSpotsClaimed,
        double FillRatePercent,
        int ActiveCasuals,
        int TotalCasuals
    );
}
