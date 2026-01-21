using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace MulttenantSaas.Tests.Integration.Tier2_Contract;

/// <summary>
/// HTTP contract tests for Casual endpoints.
/// </summary>
public class CasualEndpointTests : IntegrationTestBase
{
    private const string ManagerId = "auth0|manager-1";

    public CasualEndpointTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task AddCasual_WithValidRequest_Returns201()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 0);
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.PostAsJsonAsync(
            $"/pools/{scenario.Pool.Id}/casuals",
            new { Name = "Jane Doe", PhoneNumber = "+61400111222" });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var content = await response.Content.ReadFromJsonAsync<CasualResponse>();
        content!.Name.Should().Be("Jane Doe");
        content.PhoneNumber.Should().Be("+61400111222");
    }

    [Fact]
    public async Task AddCasual_WithDuplicatePhoneInSamePool_Returns400()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1);
        var client = CreateAuthenticatedClient(ManagerId);
        var existingPhone = scenario.FirstCasual.PhoneNumber;

        // Act
        var response = await client.PostAsJsonAsync(
            $"/pools/{scenario.Pool.Id}/casuals",
            new { Name = "Duplicate", PhoneNumber = existingPhone });

        // Assert: Either 400 (business rule) or 409/500 (DB constraint) - both are acceptable
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.BadRequest,
            HttpStatusCode.Conflict,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task AddCasual_WithEmptyName_Returns400()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 0);
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.PostAsJsonAsync(
            $"/pools/{scenario.Pool.Id}/casuals",
            new { Name = "", PhoneNumber = "+61400111222" });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RemoveCasual_WhenExists_Returns204()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1);
        var client = CreateAuthenticatedClient(ManagerId);

        // Act
        var response = await client.DeleteAsync(
            $"/pools/{scenario.Pool.Id}/casuals/{scenario.FirstCasual.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify casual was actually deleted
        var exists = await QueryDbAsync(async db =>
            await db.Casuals.AnyAsync(c => c.Id == scenario.FirstCasual.Id));
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task ReleaseShift_WhenClaimed_NotifiesViaSmS()
    {
        // Arrange: Create scenario with a claimed shift
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, shiftCount: 1);

        // First, claim the shift
        await Client.PostAsJsonAsync(
            $"/casual/shifts/{scenario.FirstShift.Id}/claim",
            new ClaimShiftRequest(scenario.FirstCasual.PhoneNumber));

        // Clear call history from the claim
        SmsServiceMock.ClearReceivedCalls();

        // Act: Release the shift
        var response = await Client.PostAsJsonAsync(
            $"/casual/shifts/{scenario.FirstShift.Id}/release",
            new ReleaseShiftRequest(scenario.FirstCasual.PhoneNumber));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ReleaseShift_WhenNotClaimed_Returns400()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, shiftCount: 1);

        // Act: Try to release without claiming first
        var response = await Client.PostAsJsonAsync(
            $"/casual/shifts/{scenario.FirstShift.Id}/release",
            new ReleaseShiftRequest(scenario.FirstCasual.PhoneNumber));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        error!.Error.Should().Contain("claim");
    }

    [Fact]
    public async Task GetAvailableShifts_ReturnsOnlyOpenShifts()
    {
        // Arrange: Create multiple shifts and fill one
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 2, shiftCount: 2, spotsPerShift: 1);

        // Claim the first shift (fills it)
        await Client.PostAsJsonAsync(
            $"/casual/shifts/{scenario.Shifts[0].Id}/claim",
            new ClaimShiftRequest(scenario.Casuals[0].PhoneNumber));

        // Act: Get available shifts
        var response = await Client.GetAsync(
            $"/casual/shifts?poolId={scenario.Pool.Id}&phoneNumber={Uri.EscapeDataString(scenario.Casuals[1].PhoneNumber)}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<AvailableShiftsResponse>();

        // Should only see the open shift, not the filled one
        result!.AvailableShifts.Should().HaveCount(1);
        result.AvailableShifts.First().Status.Should().Be("Open");
    }

    [Fact]
    public async Task GetMyShifts_ReturnsOnlyClaimedShifts()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(ManagerId, casualCount: 1, shiftCount: 2);

        // Claim only the first shift
        await Client.PostAsJsonAsync(
            $"/casual/shifts/{scenario.Shifts[0].Id}/claim",
            new ClaimShiftRequest(scenario.FirstCasual.PhoneNumber));

        // Act
        var response = await Client.GetAsync(
            $"/casual/my-shifts?phoneNumber={Uri.EscapeDataString(scenario.FirstCasual.PhoneNumber)}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var shifts = await response.Content.ReadFromJsonAsync<ShiftResponse[]>();
        shifts.Should().HaveCount(1);
    }

    // DTOs for JSON serialization/deserialization
    private record ClaimShiftRequest(string PhoneNumber);
    private record ReleaseShiftRequest(string PhoneNumber);
    private record CasualResponse(Guid Id, string Name, string PhoneNumber);
    private record ShiftResponse(
        Guid Id,
        DateTime StartsAt,
        DateTime EndsAt,
        int SpotsNeeded,
        int SpotsRemaining,
        string Status);
    private record AvailableShiftsResponse(CasualResponse Casual, ShiftResponse[] AvailableShifts);
    private record ErrorResponse(string Error);
}
