using FluentAssertions;
using Microsoft.Extensions.Time.Testing;
using MulttenantSaas.Tests.TestHelpers;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Domain;

public class ShiftClaimTests
{
    private readonly FakeTimeProvider _timeProvider;
    private readonly DateTime _fixedNow = new(2024, 6, 15, 9, 0, 0, DateTimeKind.Utc);
    private readonly Pool _pool;

    public ShiftClaimTests()
    {
        _timeProvider = new FakeTimeProvider(_fixedNow);
        _pool = Pool.Create("Test Pool", "auth0|manager", _timeProvider).Value!;
    }

    [Fact]
    public void Create_SetsStatusToClaimed()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 2,
            _timeProvider
        ).Value!;

        // Act
        var result = casual.ClaimShift(shift, _timeProvider);

        // Assert
        var claim = result.Should().BeSuccess().Which;
        claim.Status.Should().Be(ClaimStatus.Claimed);
        claim.ClaimedAt.Should().Be(_fixedNow);
        claim.ReleasedAt.Should().BeNull();
    }

    [Fact]
    public void MarkAsBailed_SetsStatusToBailed()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 2,
            _timeProvider
        ).Value!;
        casual.ClaimShift(shift, _timeProvider);

        // Advance time to simulate delay before bailing
        _timeProvider.Advance(TimeSpan.FromHours(2));

        // Act
        var result = casual.ReleaseShift(shift, _timeProvider);

        // Assert
        var claim = result.Should().BeSuccess().Which;
        claim.Status.Should().Be(ClaimStatus.Bailed);
        claim.ReleasedAt.Should().Be(_fixedNow.AddHours(2));
    }

    [Fact]
    public void MarkAsReleasedByManager_SetsStatusToReleasedByManager()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 2,
            _timeProvider
        ).Value!;
        casual.ClaimShift(shift, _timeProvider);

        // Advance time to simulate manager releasing later
        _timeProvider.Advance(TimeSpan.FromHours(3));

        // Act
        var result = shift.ManagerReleaseCasual(casual, _timeProvider);

        // Assert
        var claim = result.Should().BeSuccess().Which;
        claim.Status.Should().Be(ClaimStatus.ReleasedByManager);
        claim.ReleasedAt.Should().Be(_fixedNow.AddHours(3));
    }

    [Fact]
    public void Claim_RecordsCorrectShiftAndCasual()
    {
        // Arrange
        var casual = _pool.AddCasual("Alice", "+61400123456", _timeProvider).Value!;
        var shift = _pool.PostShift(
            _fixedNow.AddDays(1),
            _fixedNow.AddDays(1).AddHours(8),
            spotsNeeded: 2,
            _timeProvider
        ).Value!;

        // Act
        var result = casual.ClaimShift(shift, _timeProvider);

        // Assert
        var claim = result.Should().BeSuccess().Which;
        claim.ShiftId.Should().Be(shift.Id);
        claim.CasualId.Should().Be(casual.Id);
        claim.Shift.Should().BeSameAs(shift);
        claim.Casual.Should().BeSameAs(casual);
    }
}
