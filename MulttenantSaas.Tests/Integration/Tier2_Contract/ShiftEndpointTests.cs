using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using NSubstitute;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Integration.Tier2_Contract;

/// <summary>
/// HTTP contract tests for Shift endpoints.
/// </summary>
public class ShiftEndpointTests : IntegrationTestBase
{
    private const string ManagerId = "auth0|manager-1";

    public ShiftEndpointTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task PostShift_WithValidRequest_Returns201AndBroadcastsSms()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 2);
        var client = CreateAuthenticatedClient(ManagerId);

        var request = new PostShiftRequest(
            StartsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1),
            EndsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(4),
            SpotsNeeded: 2);

        // Act
        var response = await client.PostAsJsonAsync($"/pools/{scenario.Pool.Id}/shifts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var content = await response.Content.ReadFromJsonAsync<ShiftResponse>();
        content!.SpotsNeeded.Should().Be(2);
        content.Status.Should().Be("Open");

        // Verify SMS was broadcast to all casuals
        await SmsServiceMock.Received(1).BroadcastShiftAvailable(
            Arg.Is<Shift>(s => s.SpotsNeeded == 2),
            Arg.Is<IEnumerable<Casual>>(c => c.Count() == 2));
    }

    [Fact]
    public async Task PostShift_WithStartTimeInPast_Returns400()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId);
        var client = CreateAuthenticatedClient(ManagerId);

        var request = new PostShiftRequest(
            StartsAt: TimeProvider.GetUtcNow().UtcDateTime.AddHours(-1), // In the past!
            EndsAt: TimeProvider.GetUtcNow().UtcDateTime.AddHours(4),
            SpotsNeeded: 1);

        // Act
        var response = await client.PostAsJsonAsync($"/pools/{scenario.Pool.Id}/shifts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        error!.Error.Should().Contain("future");
    }

    [Fact]
    public async Task PostShift_WithEndBeforeStart_Returns400()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId);
        var client = CreateAuthenticatedClient(ManagerId);

        var request = new PostShiftRequest(
            StartsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1),
            EndsAt: TimeProvider.GetUtcNow().UtcDateTime.AddHours(12), // Before start!
            SpotsNeeded: 1);

        // Act
        var response = await client.PostAsJsonAsync($"/pools/{scenario.Pool.Id}/shifts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        error!.Error.Should().Contain("after");
    }

    [Fact]
    public async Task PostShift_WithZeroSpots_Returns400()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId);
        var client = CreateAuthenticatedClient(ManagerId);

        var request = new PostShiftRequest(
            StartsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1),
            EndsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(4),
            SpotsNeeded: 0);

        // Act
        var response = await client.PostAsJsonAsync($"/pools/{scenario.Pool.Id}/shifts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        error!.Error.Should().Contain("spot");
    }

    [Fact]
    public async Task CancelShift_WhenOpen_TransitionsStatus()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, shiftCount: 1);
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.PostAsync(
            $"/pools/{scenario.Pool.Id}/shifts/{scenario.FirstShift.Id}/cancel",
            null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify the status changed in DB
        var status = await QueryDbAsync(async db =>
        {
            var shift = await db.Shifts.FindAsync(scenario.FirstShift.Id);
            return shift!.Status;
        });
        status.Should().Be(ShiftStatus.Cancelled);
    }

    [Fact]
    public async Task GetShifts_ReturnsShiftsForPool()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, shiftCount: 3);
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.GetAsync($"/pools/{scenario.Pool.Id}/shifts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var shifts = await response.Content.ReadFromJsonAsync<ShiftResponse[]>();
        shifts.Should().HaveCount(3);
    }

    // DTOs for JSON serialization/deserialization
    private record PostShiftRequest(DateTime StartsAt, DateTime EndsAt, int SpotsNeeded);
    private record ShiftResponse(
        Guid Id,
        DateTime StartsAt,
        DateTime EndsAt,
        int SpotsNeeded,
        int SpotsRemaining,
        string Status);
    private record ErrorResponse(string Error);
}
