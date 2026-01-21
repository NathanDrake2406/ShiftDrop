using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MulttenantSaas.Tests.Integration.Tier1_Critical;

/// <summary>
/// Tests for concurrent shift claiming - the core business differentiator.
/// These tests verify that the "first-come-first-served" model works correctly
/// under race conditions, which CANNOT be tested with unit tests alone.
/// </summary>
public class ShiftClaimConcurrencyTests : IntegrationTestBase
{
    private const string ManagerId = "auth0|manager-1";

    public ShiftClaimConcurrencyTests(ShiftDropWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task ClaimShift_WhenTwoCasualsRaceForLastSpot_OneSucceedsOneFails()
    {
        // Arrange: Create a shift with exactly 1 spot and 2 casuals who will race for it
        var scenario = await SeedScenarioAsync(
            managerId: ManagerId,
            casualCount: 2,
            shiftCount: 1,
            spotsPerShift: 1); // Only ONE spot!

        var shift = scenario.FirstShift;
        var casual1 = scenario.Casuals[0];
        var casual2 = scenario.Casuals[1];

        // Act: Fire both claims simultaneously
        var claim1Task = Client.PostAsJsonAsync(
            $"/casual/shifts/{shift.Id}/claim",
            new ClaimShiftRequest(casual1.PhoneNumber));

        var claim2Task = Client.PostAsJsonAsync(
            $"/casual/shifts/{shift.Id}/claim",
            new ClaimShiftRequest(casual2.PhoneNumber));

        var responses = await Task.WhenAll(claim1Task, claim2Task);

        // Assert: Exactly one 200 OK and one failure (409 Conflict or 400 BadRequest)
        // 409 = Requests raced and one lost due to concurrency conflict
        // 400 = First request completed, second saw "shift filled" business rule
        var statusCodes = responses.Select(r => r.StatusCode).ToList();

        statusCodes.Should().Contain(HttpStatusCode.OK, "one casual should successfully claim");
        statusCodes.Count(s => s == HttpStatusCode.OK).Should().Be(1, "exactly one should succeed");
        statusCodes.Count(s => s == HttpStatusCode.Conflict || s == HttpStatusCode.BadRequest)
            .Should().Be(1, "exactly one should fail with conflict or business rule rejection");
    }

    [Fact]
    public async Task ClaimShift_WhenManyCasualsRaceForMultipleSpots_AtLeastOneSucceeds()
    {
        // Arrange: 3 spots, 5 casuals racing
        var scenario = await SeedScenarioAsync(
            managerId: ManagerId,
            casualCount: 5,
            shiftCount: 1,
            spotsPerShift: 3);

        var shift = scenario.FirstShift;

        // Act: Fire all 5 claims simultaneously
        var tasks = scenario.Casuals.Select(casual =>
            Client.PostAsJsonAsync(
                $"/casual/shifts/{shift.Id}/claim",
                new ClaimShiftRequest(casual.PhoneNumber)));

        var responses = await Task.WhenAll(tasks);

        // Assert: With optimistic concurrency (no retry), simultaneous requests that read
        // the same SpotsRemaining value will mostly conflict. At minimum:
        // - At least 1 should succeed (the first to commit wins)
        // - The rest get 409 Conflict or 400 BadRequest
        // - No more than 3 can succeed (only 3 spots exist)
        var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
        var failureCount = responses.Count(r =>
            r.StatusCode == HttpStatusCode.Conflict ||
            r.StatusCode == HttpStatusCode.BadRequest);

        successCount.Should().BeGreaterThanOrEqualTo(1, "at least one claim should succeed");
        successCount.Should().BeLessThanOrEqualTo(3, "cannot exceed available spots");
        (successCount + failureCount).Should().Be(5, "all requests should resolve to success or failure");
    }

    [Fact]
    public async Task ClaimShift_WhenShiftAlreadyFilled_Returns400NotConflict()
    {
        // Arrange: Create a filled shift (1 spot, 1 casual already claimed it)
        var scenario = await SeedScenarioAsync(
            managerId: ManagerId,
            casualCount: 2,
            shiftCount: 1,
            spotsPerShift: 1);

        var shift = scenario.FirstShift;
        var casual1 = scenario.Casuals[0];
        var casual2 = scenario.Casuals[1];

        // First casual claims successfully
        var firstResponse = await Client.PostAsJsonAsync(
            $"/casual/shifts/{shift.Id}/claim",
            new ClaimShiftRequest(casual1.PhoneNumber));
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act: Second casual tries to claim AFTER the shift is filled (not racing)
        var secondResponse = await Client.PostAsJsonAsync(
            $"/casual/shifts/{shift.Id}/claim",
            new ClaimShiftRequest(casual2.PhoneNumber));

        // Assert: Should be 400 (business rule rejection) not 409 (concurrency conflict)
        // This is important: 409 means "you raced and lost", 400 means "this shift is filled"
        secondResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await secondResponse.Content.ReadFromJsonAsync<ErrorResponse>();
        content!.Error.Should().ContainAny("filled", "spots", "remaining");
    }

    [Fact]
    public async Task ClaimShift_WhenSameCasualClaimsTwice_SecondClaimFails()
    {
        // Arrange
        var scenario = await SeedScenarioAsync(
            managerId: ManagerId,
            casualCount: 1,
            shiftCount: 1,
            spotsPerShift: 2); // Multiple spots to ensure it's not "shift filled"

        var shift = scenario.FirstShift;
        var casual = scenario.FirstCasual;

        // First claim
        var firstResponse = await Client.PostAsJsonAsync(
            $"/casual/shifts/{shift.Id}/claim",
            new ClaimShiftRequest(casual.PhoneNumber));
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act: Same casual tries to claim again
        var secondResponse = await Client.PostAsJsonAsync(
            $"/casual/shifts/{shift.Id}/claim",
            new ClaimShiftRequest(casual.PhoneNumber));

        // Assert
        secondResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await secondResponse.Content.ReadFromJsonAsync<ErrorResponse>();
        content!.Error.Should().Contain("already");
    }

    // DTOs for JSON serialization/deserialization
    private record ClaimShiftRequest(string PhoneNumber);
    private record ErrorResponse(string Error);
}
