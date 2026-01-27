using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using Serilog;
using ShiftDrop.Common.Services;
using Testcontainers.PostgreSql;

namespace MulttenantSaas.Tests.Integration;

/// <summary>
/// Custom WebApplicationFactory that:
/// 1. Uses Testcontainers PostgreSQL (required for concurrency token testing)
/// 2. Replaces ISmsService with a mock
/// 3. Uses FakeTimeProvider for deterministic time control
/// 4. Adds test authentication handler
/// </summary>
public class ShiftDropWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("shiftdrop_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public ISmsService SmsServiceMock { get; } = Substitute.For<ISmsService>();
    public FakeTimeProvider FakeTimeProvider { get; } = new();

    private static readonly object _serilogLock = new();
    private static bool _serilogReset;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Reset Serilog's static logger to prevent "logger is already frozen" errors
        // when multiple test classes run. Each WebApplicationFactory tries to freeze
        // the same static Log.Logger, which fails on subsequent attempts.
        // Use a lock to ensure only one thread does this.
        lock (_serilogLock)
        {
            if (!_serilogReset)
            {
                Log.CloseAndFlush();
                Log.Logger = new LoggerConfiguration()
                    .MinimumLevel.Warning()
                    .WriteTo.Console()
                    .CreateLogger();
                _serilogReset = true;
            }
        }

        // Use standard logging instead of Serilog for tests
        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddConsole();
            logging.SetMinimumLevel(LogLevel.Warning);
        });

        builder.ConfigureTestServices(services =>
        {
            // Remove the existing DbContext registration
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();

            // Add Testcontainers PostgreSQL with detailed logging
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_postgresContainer.GetConnectionString())
                    .EnableSensitiveDataLogging()
                    .EnableDetailedErrors());

            // Replace ISmsService with mock
            services.RemoveAll<ISmsService>();
            services.AddScoped(_ => SmsServiceMock);

            // Replace TimeProvider with fake
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(FakeTimeProvider);

            // Remove the OutboxProcessor background service to prevent it from
            // trying to query the database before it's created
            services.RemoveAll<IHostedService>();

            // Replace authentication with test scheme
            // We need to reconfigure the authentication to use our test handler as default
            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<TestAuthHandler.TestAuthOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName,
                    options => { });

            // Override AuthenticationOptions to ensure our scheme is used
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                options.DefaultScheme = TestAuthHandler.SchemeName;
            });
        });
    }

    private bool _initialized;

    public async Task InitializeAsync()
    {
        // Start PostgreSQL container
        await _postgresContainer.StartAsync();

        // Set a reasonable default time (not in the past for shift creation)
        FakeTimeProvider.SetUtcNow(new DateTimeOffset(2024, 6, 15, 9, 0, 0, TimeSpan.Zero));

        // Apply migrations by creating a scope
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        _initialized = true;
    }

    /// <summary>
    /// Ensures the factory is fully initialized before running tests.
    /// Call this from test base classes before accessing the database.
    /// </summary>
    public void EnsureInitialized()
    {
        if (!_initialized)
        {
            throw new InvalidOperationException(
                "ShiftDropWebApplicationFactory is not initialized. " +
                "Ensure IAsyncLifetime.InitializeAsync() has completed before running tests.");
        }
    }

    public new async Task DisposeAsync()
    {
        await _postgresContainer.DisposeAsync();
        await base.DisposeAsync();
    }
}
