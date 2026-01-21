using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MulttenantSaas.Tests.Integration.Tier1_Critical;

/// <summary>
/// Tests that all manager endpoints require authentication.
/// A misconfiguration here would expose all manager operations publicly.
/// </summary>
public class AuthenticationTests : IntegrationTestBase
{
    public AuthenticationTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    public static TheoryData<string, string, object?> ProtectedManagerEndpoints => new()
    {
        // Pools
        { "POST", "/pools", new { Name = "Test Pool" } },
        { "GET", "/pools", null },
        { "GET", $"/pools/{Guid.NewGuid()}", null },

        // Casuals
        { "POST", $"/pools/{Guid.NewGuid()}/casuals", new { Name = "Test", PhoneNumber = "+61400000000" } },
        { "DELETE", $"/pools/{Guid.NewGuid()}/casuals/{Guid.NewGuid()}", null },

        // Shifts (manager side)
        { "POST", $"/pools/{Guid.NewGuid()}/shifts", new { StartsAt = DateTime.UtcNow.AddDays(1), EndsAt = DateTime.UtcNow.AddDays(1).AddHours(4), SpotsNeeded = 1 } },
        { "GET", $"/pools/{Guid.NewGuid()}/shifts", null },
        { "POST", $"/pools/{Guid.NewGuid()}/shifts/{Guid.NewGuid()}/cancel", null },
        { "POST", $"/pools/{Guid.NewGuid()}/shifts/{Guid.NewGuid()}/release/{Guid.NewGuid()}", null },
    };

    [Theory]
    [MemberData(nameof(ProtectedManagerEndpoints))]
    public async Task ManagerEndpoint_WithoutAuthentication_Returns401(string method, string path, object? body)
    {
        // Arrange: Use unauthenticated client (no X-Test-User-Id header)
        var request = new HttpRequestMessage(new HttpMethod(method), path);

        if (body != null)
        {
            request.Content = JsonContent.Create(body);
        }

        // Act
        var response = await Client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized,
            $"{method} {path} should require authentication");
    }

    public static TheoryData<string, string, object?> PublicCasualEndpoints => new()
    {
        // All casual endpoints are anonymous (identified by phone number)
        { "GET", $"/casual/shifts?poolId={Guid.NewGuid()}&phoneNumber=%2B61400000000", null },
        { "POST", $"/casual/shifts/{Guid.NewGuid()}/claim", new { PhoneNumber = "+61400000000" } },
        { "POST", $"/casual/shifts/{Guid.NewGuid()}/release", new { PhoneNumber = "+61400000000" } },
        { "GET", $"/casual/my-shifts?phoneNumber=%2B61400000000", null },
    };

    [Theory]
    [MemberData(nameof(PublicCasualEndpoints))]
    public async Task CasualEndpoint_WithoutAuthentication_DoesNotReturn401(string method, string path, object? body)
    {
        // Arrange: Use unauthenticated client
        var request = new HttpRequestMessage(new HttpMethod(method), path);

        if (body != null)
        {
            request.Content = JsonContent.Create(body);
        }

        // Act
        var response = await Client.SendAsync(request);

        // Assert: Should NOT be 401 - casual endpoints are public
        // They might return 404 (not found) or 400 (bad request), but never 401
        response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized,
            $"{method} {path} is a casual endpoint and should be accessible without authentication");
    }

    [Fact]
    public async Task HealthEndpoint_IsPublic()
    {
        // Act
        var response = await Client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
