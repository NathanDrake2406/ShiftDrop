using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using ShiftDrop.Common.Services;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Integration;

/// <summary>
/// Base class for integration tests providing common setup and helper methods.
/// Each test gets a clean database state.
/// </summary>
public abstract class IntegrationTestBase : IClassFixture<ShiftDropWebApplicationFactory>, IAsyncLifetime
{
    protected readonly ShiftDropWebApplicationFactory Factory;
    protected readonly HttpClient Client;

    protected IntegrationTestBase(ShiftDropWebApplicationFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    /// <summary>
    /// Creates an HTTP client authenticated as the specified user (manager ID).
    /// </summary>
    protected HttpClient CreateAuthenticatedClient(string userId)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId);
        return client;
    }

    /// <summary>
    /// Executes a database action within a scope.
    /// Use for seeding test data or querying results.
    /// </summary>
    protected async Task ExecuteDbAsync(Func<AppDbContext, Task> action)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await action(db);
    }

    /// <summary>
    /// Executes a database query and returns the result.
    /// </summary>
    protected async Task<T> QueryDbAsync<T>(Func<AppDbContext, Task<T>> query)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await query(db);
    }

    /// <summary>
    /// Gets the FakeTimeProvider for controlling time in tests.
    /// </summary>
    protected FakeTimeProvider TimeProvider => Factory.FakeTimeProvider;

    /// <summary>
    /// Gets the mocked SMS service for verification.
    /// </summary>
    protected ISmsService SmsServiceMock => Factory.SmsServiceMock;

    /// <summary>
    /// Seeds a complete test scenario: a pool with casuals and optional shifts.
    /// Returns the seeded entities for test assertions.
    /// </summary>
    protected async Task<TestScenario> SeedScenarioAsync(
        string managerId,
        string poolName = "Test Pool",
        int casualCount = 1,
        int shiftCount = 0,
        int spotsPerShift = 1)
    {
        var scenario = new TestScenario();

        await ExecuteDbAsync(async db =>
        {
            // Create pool - DON'T add to DbContext yet
            var poolResult = Pool.Create(poolName, managerId, TimeProvider);
            scenario.Pool = poolResult.Value!;

            // Create casuals
            for (int i = 0; i < casualCount; i++)
            {
                var casualResult = scenario.Pool.AddCasual(
                    $"Casual {i + 1}",
                    $"+6140000000{i}",
                    TimeProvider);
                scenario.Casuals.Add(casualResult.Value!);
            }

            // Create shifts
            for (int i = 0; i < shiftCount; i++)
            {
                var shiftResult = scenario.Pool.PostShift(
                    TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(i),
                    TimeProvider.GetUtcNow().UtcDateTime.AddDays(1).AddHours(i + 4),
                    spotsPerShift,
                    TimeProvider);
                scenario.Shifts.Add(shiftResult.Value!);
            }

            // Add pool AFTER all related entities are attached via navigation
            // EF Core will discover and track all related entities through navigation properties
            db.Pools.Add(scenario.Pool);
            await db.SaveChangesAsync();

            // Detach all entities to prevent any tracking issues
            // The API will load fresh entities from the database
            db.ChangeTracker.Clear();
        });

        return scenario;
    }

    /// <summary>
    /// Cleans up the database before each test for isolation.
    /// </summary>
    public async Task InitializeAsync()
    {
        // Clear all data before each test
        await ExecuteDbAsync(async db =>
        {
            db.ShiftClaims.RemoveRange(db.ShiftClaims);
            db.Shifts.RemoveRange(db.Shifts);
            db.Casuals.RemoveRange(db.Casuals);
            db.Pools.RemoveRange(db.Pools);
            await db.SaveChangesAsync();
        });

        // Reset the SMS mock before each test
        SmsServiceMock.ClearReceivedCalls();
    }

    public Task DisposeAsync() => Task.CompletedTask;
}

/// <summary>
/// Container for seeded test data.
/// </summary>
public class TestScenario
{
    public Pool Pool { get; set; } = null!;
    public List<Casual> Casuals { get; } = new();
    public List<Shift> Shifts { get; } = new();

    public Casual FirstCasual => Casuals[0];
    public Shift FirstShift => Shifts[0];
}
