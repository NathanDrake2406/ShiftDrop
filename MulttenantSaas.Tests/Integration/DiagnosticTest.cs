using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace MulttenantSaas.Tests.Integration;

public class DiagnosticTest : IntegrationTestBase
{
    public DiagnosticTest(ShiftDropWebApplicationFactory factory) : base(factory) {}

    [Fact]
    public async Task VerifySeeding_ShiftExistsInDatabase()
    {
        // Seed
        var scenario = await SeedScenarioAsync("auth0|test", casualCount: 1, shiftCount: 1, spotsPerShift: 2);

        // Verify data in DB using a fresh query
        var (shiftExists, spotsRemaining, shiftId) = await QueryDbAsync(async db =>
        {
            var shift = await db.Shifts.AsNoTracking().FirstOrDefaultAsync(s => s.Id == scenario.FirstShift.Id);
            return (shift != null, shift?.SpotsRemaining ?? -1, shift?.Id ?? Guid.Empty);
        });

        shiftExists.Should().BeTrue("shift should exist in database");
        spotsRemaining.Should().Be(2, "shift should have 2 spots remaining");
        shiftId.Should().Be(scenario.FirstShift.Id, "IDs should match");
    }

    [Fact]
    public async Task SingleClaim_WithFreshDbContext_ShouldSucceed()
    {
        var scenario = await SeedScenarioAsync("auth0|test", casualCount: 1, shiftCount: 1, spotsPerShift: 2);
        
        // First verify the data is there with a fresh DbContext
        var beforeClaim = await QueryDbAsync(async db =>
        {
            var shift = await db.Shifts.AsNoTracking().FirstOrDefaultAsync(s => s.Id == scenario.FirstShift.Id);
            var casual = await db.Casuals.AsNoTracking().FirstOrDefaultAsync(c => c.Id == scenario.FirstCasual.Id);
            return new { ShiftExists = shift != null, CasualExists = casual != null, SpotsRemaining = shift?.SpotsRemaining ?? -1 };
        });
        
        beforeClaim.ShiftExists.Should().BeTrue("shift must exist before claim");
        beforeClaim.CasualExists.Should().BeTrue("casual must exist before claim");
        beforeClaim.SpotsRemaining.Should().Be(2, "should have 2 spots");

        // Now try the claim
        var response = await Client.PostAsJsonAsync(
            $"/casual/shifts/{scenario.FirstShift.Id}/claim",
            new ClaimRequest(scenario.FirstCasual.PhoneNumber));

        // Get response content for debugging
        var content = await response.Content.ReadAsStringAsync();
        
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"Claim should succeed. ShiftId: {scenario.FirstShift.Id}, Phone: {scenario.FirstCasual.PhoneNumber}, Response: {content}");
    }

    private record ClaimRequest(string PhoneNumber);
}
