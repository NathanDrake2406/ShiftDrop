using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MulttenantSaas.Tests.Integration.Tier1_Critical;

/// <summary>
/// Tests for multi-tenancy isolation - ensuring managers and casuals
/// can only access resources within their own pool.
/// A bug here would be a data breach.
/// </summary>
public class MultiTenancyIsolationTests : IntegrationTestBase
{
    private const string Manager1Id = "auth0|manager-1";
    private const string Manager2Id = "auth0|manager-2";

    public MultiTenancyIsolationTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task Manager_CannotAccessAnotherManagersPool()
    {
        // Arrange: Create pool for Manager 1
        var scenario = await SeedScenarioAsync(Manager1Id, "Manager 1 Pool");

        // Act: Manager 2 tries to access Manager 1's pool
        var manager2Client = CreateAuthenticatedClient(Manager2Id);
        var response = await manager2Client.GetAsync($"/pools/{scenario.Pool.Id}");

        // Assert: Should get 404 (not 403 - don't reveal pool exists)
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Manager_CannotPostShiftToAnotherManagersPool()
    {
        // Arrange: Create pool for Manager 1
        var scenario = await SeedScenarioAsync(Manager1Id, "Manager 1 Pool");

        var shiftRequest = new PostShiftRequest(
            StartsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1),
            EndsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(4),
            SpotsNeeded: 1);

        // Act: Manager 2 tries to post shift to Manager 1's pool
        var manager2Client = CreateAuthenticatedClient(Manager2Id);
        var response = await manager2Client.PostAsJsonAsync(
            $"/pools/{scenario.Pool.Id}/shifts",
            shiftRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Manager_CannotAddCasualToAnotherManagersPool()
    {
        // Arrange: Create pool for Manager 1
        var scenario = await SeedScenarioAsync(Manager1Id, "Manager 1 Pool");

        // Act: Manager 2 tries to add casual to Manager 1's pool
        var manager2Client = CreateAuthenticatedClient(Manager2Id);
        var response = await manager2Client.PostAsJsonAsync(
            $"/pools/{scenario.Pool.Id}/casuals",
            new { Name = "Sneaky Casual", PhoneNumber = "+61499999999" });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Manager_CannotCancelShiftInAnotherManagersPool()
    {
        // Arrange: Create pool with shift for Manager 1
        var scenario = await SeedScenarioAsync(
            Manager1Id,
            "Manager 1 Pool",
            casualCount: 1,
            shiftCount: 1);

        // Act: Manager 2 tries to cancel Manager 1's shift
        var manager2Client = CreateAuthenticatedClient(Manager2Id);
        var response = await manager2Client.PostAsync(
            $"/pools/{scenario.Pool.Id}/shifts/{scenario.FirstShift.Id}/cancel",
            null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Casual_CannotClaimShiftFromAnotherPool()
    {
        // Arrange: Create two pools, each with a casual and a shift
        var pool1 = await SeedScenarioAsync(Manager1Id, "Pool 1", casualCount: 1, shiftCount: 1);
        var pool2 = await SeedScenarioAsync(Manager2Id, "Pool 2", casualCount: 1, shiftCount: 1);

        // Pool 1's casual tries to claim Pool 2's shift
        var casualFromPool1 = pool1.FirstCasual;
        var shiftFromPool2 = pool2.FirstShift;

        // Act
        var response = await Client.PostAsJsonAsync(
            $"/casual/shifts/{shiftFromPool2.Id}/claim",
            new ClaimShiftRequest(casualFromPool1.PhoneNumber));

        // Assert: Should fail - casual is not in Pool 2
        response.StatusCode.Should().Be(HttpStatusCode.NotFound,
            "casual should not find shifts outside their pool");
    }

    [Fact]
    public async Task Manager_CanAccessTheirOwnPool()
    {
        // Arrange: Create pool for Manager 1
        var scenario = await SeedScenarioAsync(Manager1Id, "My Pool");

        // Act: Manager 1 accesses their own pool
        var manager1Client = CreateAuthenticatedClient(Manager1Id);
        var response = await manager1Client.GetAsync($"/pools/{scenario.Pool.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Casual_CanClaimShiftInTheirOwnPool()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(
            Manager1Id,
            casualCount: 1,
            shiftCount: 1);

        // Act: Casual claims shift in their pool
        var response = await Client.PostAsJsonAsync(
            $"/casual/shifts/{scenario.FirstShift.Id}/claim",
            new ClaimShiftRequest(scenario.FirstCasual.PhoneNumber));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Manager_ListingPools_OnlySeesTheirOwn()
    {
        // Arrange: Create pools for both managers
        await SeedScenarioAsync(Manager1Id, "Manager 1 Pool A");
        await SeedScenarioAsync(Manager1Id, "Manager 1 Pool B");
        await SeedScenarioAsync(Manager2Id, "Manager 2 Pool");

        // Act: Manager 1 lists their pools
        var manager1Client = CreateAuthenticatedClient(Manager1Id);
        var response = await manager1Client.GetAsync("/pools");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var pools = await response.Content.ReadFromJsonAsync<PoolListResponse[]>();
        pools.Should().HaveCount(2, "Manager 1 has exactly 2 pools");
        pools.Should().AllSatisfy(p => p.Name.Should().StartWith("Manager 1"));
    }

    // DTOs for JSON serialization/deserialization
    private record PostShiftRequest(DateTime StartsAt, DateTime EndsAt, int SpotsNeeded);
    private record ClaimShiftRequest(string PhoneNumber);
    private record PoolListResponse(Guid Id, string Name, DateTime CreatedAt);
}
