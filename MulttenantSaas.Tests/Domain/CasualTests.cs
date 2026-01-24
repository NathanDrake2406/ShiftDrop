using FluentAssertions;
using Microsoft.Extensions.Time.Testing;
using MulttenantSaas.Tests.TestHelpers;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Domain;

public class CasualTests
{
    private readonly FakeTimeProvider _timeProvider;
    private readonly DateTime _fixedNow = new(2024, 6, 15, 9, 0, 0, DateTimeKind.Utc);
    private readonly Pool _pool;

    public CasualTests()
    {
        _timeProvider = new FakeTimeProvider(_fixedNow);
        _pool = Pool.Create("Test Pool", "auth0|manager", _timeProvider).Value!;
    }

    #region Create Validation Tests

    [Fact]
    public void Create_WithEmptyName_ReturnsFailure()
    {
        // Arrange
        var name = "";
        var phoneNumber = "+61400123456";

        // Act
        var result = _pool.AddCasual(name, phoneNumber, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("name cannot be empty");
    }

    [Fact]
    public void Create_WithEmptyPhoneNumber_ReturnsFailure()
    {
        // Arrange
        var name = "Alice";
        var phoneNumber = "";

        // Act
        var result = _pool.AddCasual(name, phoneNumber, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("Phone number is required");
    }

    [Fact]
    public void Create_GeneratesInviteToken()
    {
        // Arrange & Act
        var result = _pool.AddCasual("Alice", "+61400123456", _timeProvider);

        // Assert
        var casual = result.Should().BeSuccess().Which;
        casual.InviteToken.Should().NotBeNullOrEmpty();
        casual.InviteToken.Should().HaveLength(32);  // Guid without hyphens
    }

    [Fact]
    public void Create_SetsInviteExpiryToOneDay()
    {
        // Arrange & Act
        var result = _pool.AddCasual("Alice", "+61400123456", _timeProvider);

        // Assert
        var casual = result.Should().BeSuccess().Which;
        var expectedExpiry = _fixedNow.AddDays(1);
        casual.InviteExpiresAt.Should().Be(expectedExpiry);
    }

    [Fact]
    public void Create_SetsInviteStatusToPending()
    {
        // Arrange & Act
        var result = _pool.AddCasual("Alice", "+61400123456", _timeProvider);

        // Assert
        var casual = result.Should().BeSuccess().Which;
        casual.InviteStatus.Should().Be(InviteStatus.Pending);
        casual.Auth0Id.Should().BeNull();  // Not linked yet
    }

    #endregion

    #region Cross-Pool Guard Tests

    [Fact]
    public void ClaimShift_WhenDifferentPool_ReturnsFailure()
    {
        // Arrange - two separate pools
        var poolA = Pool.Create("Pool A", "auth0|managerA", _timeProvider).Value!;
        var poolB = Pool.Create("Pool B", "auth0|managerB", _timeProvider).Value!;

        var casualFromPoolA = poolA.AddCasual("Alice", "+61400111111", _timeProvider).Value!;
        var shiftInPoolB = poolB.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 2,
            _timeProvider
        ).Value!;

        // Act - Alice (Pool A) tries to claim a shift in Pool B
        var result = casualFromPoolA.ClaimShift(shiftInPoolB, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("different pool");
    }

    #endregion

    #region Duplicate Claim Prevention Tests

    [Fact]
    public void ClaimShift_WhenAlreadyClaimed_ReturnsFailure()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 3,
            _timeProvider
        ).Value!;

        casual.ClaimShift(shift, _timeProvider);  // First claim succeeds

        // Act - try to claim again
        var result = casual.ClaimShift(shift, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("already claimed");
    }

    [Fact]
    public void ClaimShift_CanReclaimAfterBailing()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 3,
            _timeProvider
        ).Value!;

        casual.ClaimShift(shift, _timeProvider);   // Claim
        casual.ReleaseShift(shift, _timeProvider); // Bail

        // Act - reclaim after bailing
        var result = casual.ClaimShift(shift, _timeProvider);

        // Assert
        result.Should().BeSuccess();
        casual.Claims.Should().HaveCount(2);  // Original claim (Bailed) + new claim
    }

    #endregion

    #region Release Tests

    [Fact]
    public void ReleaseShift_WithNoActiveClaim_ReturnsFailure()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 3,
            _timeProvider
        ).Value!;
        // Alice never claimed the shift

        // Act
        var result = casual.ReleaseShift(shift, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("No active claim found");
    }

    [Fact]
    public void ReleaseShift_MarksClaimAsBailed()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 3,
            _timeProvider
        ).Value!;
        casual.ClaimShift(shift, _timeProvider);

        // Act
        var result = casual.ReleaseShift(shift, _timeProvider);

        // Assert
        var claim = result.Should().BeSuccess().Which;
        claim.Status.Should().Be(ClaimStatus.Bailed);
    }

    #endregion
}
