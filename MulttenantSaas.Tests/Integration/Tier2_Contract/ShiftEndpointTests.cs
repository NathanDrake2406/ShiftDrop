using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
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
    public async Task PostShift_WithActiveCasuals_CreatesOutboxMessagesForNotifications()
    {
        // Arrange - activate casuals so they receive notifications
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 2, activateCasuals: true);
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

        // Verify outbox messages were created for each active casual
        var outboxCount = await QueryDbAsync(async db =>
            await db.OutboxMessages.CountAsync(m => m.MessageType == nameof(ShiftBroadcastPayload)));
        outboxCount.Should().Be(2, "one outbox message per active casual");

        // Verify ShiftNotifications were created
        var notificationCount = await QueryDbAsync(async db =>
            await db.ShiftNotifications.CountAsync());
        notificationCount.Should().Be(2, "one notification per active casual");
    }

    [Fact]
    public async Task PostShift_WithPendingCasuals_DoesNotCreateOutboxMessages()
    {
        // Arrange - casuals are NOT activated (still pending invite)
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 2, activateCasuals: false);
        var client = CreateAuthenticatedClient(ManagerId);

        var request = new PostShiftRequest(
            StartsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1),
            EndsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(4),
            SpotsNeeded: 2);

        // Act
        var response = await client.PostAsJsonAsync($"/pools/{scenario.Pool.Id}/shifts", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        // No outbox messages for pending casuals
        var outboxCount = await QueryDbAsync(async db =>
            await db.OutboxMessages.CountAsync(m => m.MessageType == nameof(ShiftBroadcastPayload)));
        outboxCount.Should().Be(0, "pending casuals should not receive notifications");
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
    public async Task CancelShift_WhenOpen_TransitionsStatusAndRevokesTokens()
    {
        // Arrange - create shift with notifications
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 2, activateCasuals: true);
        var client = CreateAuthenticatedClient(ManagerId);

        // First create a shift (which creates notifications)
        var shiftRequest = new PostShiftRequest(
            StartsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1),
            EndsAt: TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(4),
            SpotsNeeded: 1);
        var createResponse = await client.PostAsJsonAsync($"/pools/{scenario.Pool.Id}/shifts", shiftRequest);
        var createdShift = await createResponse.Content.ReadFromJsonAsync<ShiftResponse>();

        // Act - cancel the shift
        var response = await client.PostAsync(
            $"/pools/{scenario.Pool.Id}/shifts/{createdShift!.Id}/cancel",
            null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify the status changed in DB
        var status = await QueryDbAsync(async db =>
        {
            var shift = await db.Shifts.FindAsync(createdShift.Id);
            return shift!.Status;
        });
        status.Should().Be(ShiftStatus.Cancelled);

        // Verify all notifications were revoked
        var pendingCount = await QueryDbAsync(async db =>
            await db.ShiftNotifications.CountAsync(sn =>
                sn.ShiftId == createdShift.Id && sn.TokenStatus == TokenStatus.Pending));
        pendingCount.Should().Be(0, "all tokens should be revoked when shift is cancelled");
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
