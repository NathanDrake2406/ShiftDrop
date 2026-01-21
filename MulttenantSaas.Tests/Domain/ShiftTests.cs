using FluentAssertions;
using Microsoft.Extensions.Time.Testing;
using MulttenantSaas.Tests.TestHelpers;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Domain;

public class ShiftTests
{
    private readonly FakeTimeProvider _timeProvider;
    private readonly DateTime _fixedNow = new(2024, 6, 15, 9, 0, 0, DateTimeKind.Utc);
    private readonly Pool _pool;

    public ShiftTests()
    {
        _timeProvider = new FakeTimeProvider(_fixedNow);
        _pool = Pool.Create("Test Pool", "auth0|manager", _timeProvider).Value!;
    }

    #region Create Validation Tests

    [Fact]
    public void Create_WithPastStartTime_ReturnsFailure()
    {
        // Arrange
        var startsAt = _fixedNow.AddHours(-1);  // 1 hour in the past
        var endsAt = _fixedNow.AddHours(7);

        // Act
        var result = _pool.PostShift(startsAt, endsAt, spotsNeeded: 2, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("Shift must start in the future");
    }

    [Fact]
    public void Create_WithEndBeforeStart_ReturnsFailure()
    {
        // Arrange
        var startsAt = _fixedNow.AddDays(1);
        var endsAt = _fixedNow.AddDays(1).AddHours(-1);  // End before start

        // Act
        var result = _pool.PostShift(startsAt, endsAt, spotsNeeded: 2, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("end time must be after start time");
    }

    [Fact]
    public void Create_WithZeroSpots_ReturnsFailure()
    {
        // Arrange
        var startsAt = _fixedNow.AddDays(1);
        var endsAt = _fixedNow.AddDays(1).AddHours(8);

        // Act
        var result = _pool.PostShift(startsAt, endsAt, spotsNeeded: 0, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("At least one spot is required");
    }

    [Fact]
    public void Create_WithValidInputs_InitializesCorrectly()
    {
        // Arrange
        var startsAt = _fixedNow.AddDays(1);
        var endsAt = _fixedNow.AddDays(1).AddHours(8);

        // Act
        var result = _pool.PostShift(startsAt, endsAt, spotsNeeded: 3, _timeProvider);

        // Assert
        var shift = result.Should().BeSuccess().Which;
        shift.StartsAt.Should().Be(startsAt);
        shift.EndsAt.Should().Be(endsAt);
        shift.SpotsNeeded.Should().Be(3);
        shift.SpotsRemaining.Should().Be(3);
        shift.Status.Should().Be(ShiftStatus.Open);
        shift.PoolId.Should().Be(_pool.Id);
    }

    #endregion

    #region Claiming Tests (State Machine)

    [Fact]
    public void AcceptClaim_DecrementsRemainingSpots()
    {
        // Arrange
        var shift = CreateShiftWithSpots(3);
        var casual = CreateCasual("Alice");

        // Act
        var result = casual.ClaimShift(shift, _timeProvider);

        // Assert
        result.Should().BeSuccess();
        shift.SpotsRemaining.Should().Be(2);  // Was 3, now 2
    }

    [Fact]
    public void AcceptClaim_WhenLastSpot_SetsStatusToFilled()
    {
        // Arrange - shift with only 1 spot
        var shift = CreateShiftWithSpots(1);
        var casual = CreateCasual("Alice");

        // Act
        var result = casual.ClaimShift(shift, _timeProvider);

        // Assert
        result.Should().BeSuccess();
        shift.SpotsRemaining.Should().Be(0);
        shift.Status.Should().Be(ShiftStatus.Filled);  // State transition!
    }

    [Fact]
    public void AcceptClaim_WhenShiftIsFilled_ReturnsFailure()
    {
        // Arrange - fill the shift first
        var shift = CreateShiftWithSpots(1);
        var alice = CreateCasual("Alice");
        alice.ClaimShift(shift, _timeProvider);  // Alice takes the last spot

        var bob = CreateCasual("Bob");

        // Act - Bob tries to claim the filled shift
        var result = bob.ClaimShift(shift, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("already filled");
    }

    [Fact]
    public void ReleaseClaim_IncrementsRemainingSpots()
    {
        // Arrange
        var shift = CreateShiftWithSpots(2);
        var casual = CreateCasual("Alice");
        casual.ClaimShift(shift, _timeProvider);
        shift.SpotsRemaining.Should().Be(1);  // Verify setup

        // Act
        casual.ReleaseShift(shift, _timeProvider);

        // Assert
        shift.SpotsRemaining.Should().Be(2);  // Back to original
    }

    [Fact]
    public void ReleaseClaim_WhenShiftWasFilled_SetsStatusToOpen()
    {
        // Arrange - fill the shift
        var shift = CreateShiftWithSpots(1);
        var casual = CreateCasual("Alice");
        casual.ClaimShift(shift, _timeProvider);
        shift.Status.Should().Be(ShiftStatus.Filled);  // Verify it's filled

        // Act - Alice bails
        casual.ReleaseShift(shift, _timeProvider);

        // Assert
        shift.Status.Should().Be(ShiftStatus.Open);  // State transition back!
        shift.SpotsRemaining.Should().Be(1);
    }

    #endregion

    #region Manager Actions

    [Fact]
    public void ManagerReleaseCasual_MarksClaimAsReleasedByManager()
    {
        // Arrange
        var shift = CreateShiftWithSpots(2);
        var casual = CreateCasual("Alice");
        casual.ClaimShift(shift, _timeProvider);

        // Act
        var result = shift.ManagerReleaseCasual(casual, _timeProvider);

        // Assert
        var claim = result.Should().BeSuccess().Which;
        claim.Status.Should().Be(ClaimStatus.ReleasedByManager);
        shift.SpotsRemaining.Should().Be(2);  // Spot freed up
    }

    [Fact]
    public void ManagerReleaseCasual_WhenCasualHasNoClaim_ReturnsFailure()
    {
        // Arrange
        var shift = CreateShiftWithSpots(2);
        var casual = CreateCasual("Alice");
        // Alice never claimed the shift

        // Act
        var result = shift.ManagerReleaseCasual(casual, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("does not have an active claim");
    }

    [Fact]
    public void Cancel_SetsStatusToCancelled()
    {
        // Arrange
        var shift = CreateShiftWithSpots(2);

        // Act
        shift.Cancel();

        // Assert
        shift.Status.Should().Be(ShiftStatus.Cancelled);
    }

    [Fact]
    public void AcceptClaim_WhenShiftIsCancelled_ReturnsFailure()
    {
        // Arrange
        var shift = CreateShiftWithSpots(2);
        shift.Cancel();
        var casual = CreateCasual("Alice");

        // Act
        var result = casual.ClaimShift(shift, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("cancelled");
    }

    #endregion

    #region Helper Methods

    private Shift CreateShiftWithSpots(int spots)
    {
        var startsAt = _fixedNow.AddDays(1);
        var endsAt = _fixedNow.AddDays(1).AddHours(8);
        return _pool.PostShift(startsAt, endsAt, spots, _timeProvider).Value!;
    }

    private Casual CreateCasual(string name)
    {
        return _pool.AddCasual(name, $"+6140000000{_pool.Casuals.Count}", _timeProvider).Value!;
    }

    #endregion
}
