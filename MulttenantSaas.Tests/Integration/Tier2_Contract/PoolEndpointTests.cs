using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MulttenantSaas.Tests.Integration.Tier2_Contract;

/// <summary>
/// HTTP contract tests for Pool endpoints.
/// Verifies status codes, headers, and response shapes.
/// </summary>
public class PoolEndpointTests : IntegrationTestBase
{
    private const string ManagerId = "auth0|manager-1";

    public PoolEndpointTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task CreatePool_WithValidRequest_Returns201WithLocationHeader()
    {
        // Arrange
        var client = CreateAuthenticatedClient(ManagerId);
        var request = new CreatePoolRequest("My New Pool");

        // Act
        var response = await client.PostAsJsonAsync("/pools", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().StartWith("/pools/");

        var content = await response.Content.ReadFromJsonAsync<CreatePoolResponse>();
        content.Should().NotBeNull();
        content!.Name.Should().Be("My New Pool");
        content.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CreatePool_WithEmptyName_Returns400()
    {
        // Arrange
        var client = CreateAuthenticatedClient(ManagerId);
        var request = new CreatePoolRequest("");

        // Act
        var response = await client.PostAsJsonAsync("/pools", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        error!.Error.Should().Contain("empty");
    }

    [Fact]
    public async Task GetPool_WhenExists_Returns200WithPool()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, "Test Pool");
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.GetAsync($"/pools/{scenario.Pool.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<PoolResponse>();
        content!.Name.Should().Be("Test Pool");
    }

    [Fact]
    public async Task GetPool_WhenNotExists_Returns404()
    {
        // Arrange
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.GetAsync($"/pools/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPools_ReturnsArrayOfPools()
    {
        // Arrange
        await SeedScenarioAsync(ManagerId, "Pool 1");
        await SeedScenarioAsync(ManagerId, "Pool 2");
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.GetAsync("/pools");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var pools = await response.Content.ReadFromJsonAsync<PoolResponse[]>();
        pools.Should().HaveCount(2);
    }

    // DTOs for JSON deserialization (using local records to avoid constructor issues)
    private record CreatePoolRequest(string Name);
    private record CreatePoolResponse(Guid Id, string Name, DateTime CreatedAt);
    private record PoolResponse(Guid Id, string Name, DateTime CreatedAt);
    private record ErrorResponse(string Error);
}
