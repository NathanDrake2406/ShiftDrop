using FluentAssertions;
using Microsoft.Extensions.Time.Testing;
using MulttenantSaas.Tests.TestHelpers;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Domain;

public class PoolTests
{
    private readonly FakeTimeProvider _timeProvider;
    private readonly DateTime _fixedNow = new(2024, 6, 15, 9, 0, 0, DateTimeKind.Utc);

    public PoolTests()
    {
        _timeProvider = new FakeTimeProvider(_fixedNow);
    }

    [Fact]
    public void Create_WithEmptyName_ReturnsFailure()
    {
        // Arrange
        var name = "";
        var managerId = "auth0|123456";

        // Act
        var result = Pool.Create(name, managerId, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("Pool name cannot be empty");
    }

    [Fact]
    public void Create_WithEmptyManagerId_ReturnsFailure()
    {
        // Arrange
        var name = "Morning Crew";
        var managerId = "";

        // Act
        var result = Pool.Create(name, managerId, _timeProvider);

        // Assert
        result.Should().BeFailure().WithError("Manager ID is required");
    }

    [Fact]
    public void Create_WithValidInputs_ReturnsSuccessWithCorrectProperties()
    {
        // Arrange
        var name = "Night Shift";
        var managerId = "auth0|789";

        // Act
        var result = Pool.Create(name, managerId, _timeProvider);

        // Assert
        var pool = result.Should().BeSuccess().Which;
        pool.Name.Should().Be(name);
        pool.ManagerAuth0Id.Should().Be(managerId);
        pool.CreatedAt.Should().Be(_fixedNow);
        pool.Casuals.Should().BeEmpty();
        pool.Shifts.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithWhitespacePaddedName_TrimsName()
    {
        // Arrange
        var name = "  Evening Crew  ";
        var managerId = "auth0|123456";

        // Act
        var result = Pool.Create(name, managerId, _timeProvider);

        // Assert
        var pool = result.Should().BeSuccess().Which;
        pool.Name.Should().Be("Evening Crew");
    }

    [Fact]
    public void AddCasual_WithValidInputs_AddsCasualToCollection()
    {
        // Arrange
        var pool = Pool.Create("Morning Crew", "auth0|123", _timeProvider).Value!;

        // Act
        var result = pool.AddCasual("Jane Doe", "+61400123456", _timeProvider);

        // Assert
        result.Should().BeSuccess();
        pool.Casuals.Should().HaveCount(1);
        pool.Casuals.First().Name.Should().Be("Jane Doe");
    }

    [Fact]
    public void PostShift_WithValidInputs_AddsShiftToCollection()
    {
        // Arrange
        var pool = Pool.Create("Morning Crew", "auth0|123", _timeProvider).Value!;
        var startsAt = _fixedNow.AddDays(1);
        var endsAt = _fixedNow.AddDays(1).AddHours(8);

        // Act
        var result = pool.PostShift(startsAt, endsAt, spotsNeeded: 3, _timeProvider);

        // Assert
        result.Should().BeSuccess();
        pool.Shifts.Should().HaveCount(1);
        pool.Shifts.First().SpotsNeeded.Should().Be(3);
    }
}
