using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace MulttenantSaas.Tests.Integration.Tier2_Contract;

/// <summary>
/// HTTP contract tests for Push Subscription endpoints.
/// </summary>
public class PushSubscriptionTests : IntegrationTestBase
{
    private const string ManagerId = "auth0|manager-push-test";

    public PushSubscriptionTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task Subscribe_WithValidActiveCasual_ReturnsOk()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, activateCasuals: true);
        var casual = scenario.FirstCasual;

        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test123",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Act
        var response = await Client.PostAsJsonAsync(
            $"/casual/push/subscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<MessageResponse>();
        content!.Message.Should().Contain("Subscribed");

        // Verify subscription was created in database
        var subscriptionExists = await QueryDbAsync(async db =>
            await db.PushSubscriptions.AnyAsync(ps =>
                ps.CasualId == casual.Id && ps.Endpoint == request.Endpoint && ps.IsActive));
        subscriptionExists.Should().BeTrue();
    }

    [Fact]
    public async Task Subscribe_WithInactiveCasual_ReturnsNotFound()
    {
        // Arrange - casual not activated (default is inactive)
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, activateCasuals: false);
        var casual = scenario.FirstCasual;

        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test-inactive",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Act
        var response = await Client.PostAsJsonAsync(
            $"/casual/push/subscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        error!.Error.Should().ContainAny("not found", "not active");
    }

    [Fact]
    public async Task Subscribe_WithNonExistentCasual_ReturnsNotFound()
    {
        // Arrange
        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test-nonexistent",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Act
        var response = await Client.PostAsJsonAsync(
            "/casual/push/subscribe/+61499999999",
            request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Subscribe_WhenAlreadySubscribed_ReturnsOkIdempotently()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, activateCasuals: true);
        var casual = scenario.FirstCasual;

        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test-idempotent",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Subscribe once
        await Client.PostAsJsonAsync(
            $"/casual/push/subscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Act - Subscribe again with same endpoint
        var response = await Client.PostAsJsonAsync(
            $"/casual/push/subscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Assert - Should still succeed (idempotent)
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify only one subscription exists
        var subscriptionCount = await QueryDbAsync(async db =>
            await db.PushSubscriptions.CountAsync(ps =>
                ps.CasualId == casual.Id && ps.Endpoint == request.Endpoint));
        subscriptionCount.Should().Be(1);
    }

    [Fact]
    public async Task Unsubscribe_WithExistingSubscription_ReturnsOk()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, activateCasuals: true);
        var casual = scenario.FirstCasual;

        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test-unsubscribe",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Subscribe first
        await Client.PostAsJsonAsync(
            $"/casual/push/subscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Act
        var response = await Client.PostAsJsonAsync(
            $"/casual/push/unsubscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify subscription was deactivated
        var subscription = await QueryDbAsync(async db =>
            await db.PushSubscriptions.FirstOrDefaultAsync(ps =>
                ps.CasualId == casual.Id && ps.Endpoint == request.Endpoint));
        subscription.Should().NotBeNull();
        subscription!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Unsubscribe_WithoutExistingSubscription_ReturnsOkIdempotently()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, activateCasuals: true);
        var casual = scenario.FirstCasual;

        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test-no-subscription",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Act - Unsubscribe without subscribing first
        var response = await Client.PostAsJsonAsync(
            $"/casual/push/unsubscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Assert - Should succeed (idempotent unsubscribe)
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Unsubscribe_WithNonExistentCasual_ReturnsNotFound()
    {
        // Arrange
        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test-nonexistent",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Act
        var response = await Client.PostAsJsonAsync(
            "/casual/push/unsubscribe/+61488888888",
            request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Subscribe_ThenUnsubscribe_ThenResubscribe_ReactivatesSubscription()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, activateCasuals: true);
        var casual = scenario.FirstCasual;

        var request = new PushSubscribeRequest(
            Endpoint: "https://fcm.googleapis.com/fcm/send/test-resubscribe",
            P256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
            Auth: "tBHItJI5svbpez7KI4CT");

        // Subscribe
        await Client.PostAsJsonAsync(
            $"/casual/push/subscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Unsubscribe
        await Client.PostAsJsonAsync(
            $"/casual/push/unsubscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Act - Resubscribe
        var response = await Client.PostAsJsonAsync(
            $"/casual/push/subscribe/{Uri.EscapeDataString(casual.PhoneNumber)}",
            request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify subscription is active again
        var hasActiveSubscription = await QueryDbAsync(async db =>
            await db.PushSubscriptions.AnyAsync(ps =>
                ps.CasualId == casual.Id && ps.Endpoint == request.Endpoint && ps.IsActive));
        hasActiveSubscription.Should().BeTrue();
    }

    // DTOs for JSON serialization/deserialization
    private record PushSubscribeRequest(string Endpoint, string P256dh, string Auth);
    private record MessageResponse(string Message);
    private record ErrorResponse(string Error);
}
