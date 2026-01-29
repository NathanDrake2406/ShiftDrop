using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ShiftDrop.Common.Services;

public class DbKeepAliveOptions
{
    public bool Enabled { get; set; } = true;
    public int IntervalSeconds { get; set; } = 600; // 10 minutes
    public string Query { get; set; } = "SELECT 1";
    public int CommandTimeoutSeconds { get; set; } = 10;
}

/// <summary>
/// Periodically pings the database to reduce cold-start latency on low tiers.
/// </summary>
public class DbKeepAliveService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DbKeepAliveService> _logger;
    private readonly DbKeepAliveOptions _options;

    public DbKeepAliveService(
        IServiceScopeFactory scopeFactory,
        ILogger<DbKeepAliveService> logger,
        IOptions<DbKeepAliveOptions> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("DbKeepAliveService disabled");
            return;
        }

        var intervalSeconds = Math.Max(_options.IntervalSeconds, 60);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(intervalSeconds));

        _logger.LogInformation(
            "DbKeepAliveService started (interval: {IntervalSeconds}s)",
            intervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PingDatabase(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "DbKeepAliveService ping failed");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("DbKeepAliveService stopped");
    }

    private async Task PingDatabase(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Database.SetCommandTimeout(_options.CommandTimeoutSeconds);

        await db.Database.ExecuteSqlRawAsync(_options.Query, ct);
        _logger.LogDebug("DbKeepAliveService ping OK");
    }
}
