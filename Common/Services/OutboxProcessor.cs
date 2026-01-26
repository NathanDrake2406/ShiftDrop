using Microsoft.EntityFrameworkCore;
using ShiftDrop.Domain;

namespace ShiftDrop.Common.Services;

/// <summary>
/// Background service that processes outbox messages for reliable SMS delivery.
/// Uses polling with PeriodicTimer for clean cancellation support.
/// </summary>
public class OutboxProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OutboxProcessor> _logger;
    private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(5);
    private readonly int _batchSize = 10;

    public OutboxProcessor(
        IServiceScopeFactory scopeFactory,
        ILogger<OutboxProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxProcessor started");

        using var timer = new PeriodicTimer(_pollInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingMessages(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error processing outbox messages");
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

        _logger.LogInformation("OutboxProcessor stopped");
    }

    private async Task ProcessPendingMessages(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var smsService = scope.ServiceProvider.GetRequiredService<ISmsService>();
        var timeProvider = scope.ServiceProvider.GetRequiredService<TimeProvider>();

        var now = timeProvider.GetUtcNow().UtcDateTime;

        // Find messages ready for processing (pending and either no retry time or retry time has passed)
        var messages = await db.OutboxMessages
            .Where(m => m.Status == OutboxStatus.Pending)
            .Where(m => m.NextRetryAt == null || m.NextRetryAt <= now)
            .OrderBy(m => m.CreatedAt)
            .Take(_batchSize)
            .ToListAsync(ct);

        foreach (var message in messages)
        {
            await ProcessMessage(message, smsService, timeProvider, ct);
        }

        if (messages.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("Processed {Count} outbox messages", messages.Count);
        }
    }

    private async Task ProcessMessage(
        OutboxMessage message,
        ISmsService smsService,
        TimeProvider timeProvider,
        CancellationToken ct)
    {
        try
        {
            await DispatchMessage(message, smsService, ct);
            message.MarkAsSent(timeProvider);

            _logger.LogDebug(
                "Sent {MessageType} message {MessageId}",
                message.MessageType,
                message.Id);
        }
        catch (Exception ex)
        {
            message.MarkAsFailed(ex.Message, timeProvider);

            _logger.LogWarning(
                ex,
                "Failed to send {MessageType} message {MessageId}, retry {RetryCount}",
                message.MessageType,
                message.Id,
                message.RetryCount);
        }
    }

    private async Task DispatchMessage(
        OutboxMessage message,
        ISmsService smsService,
        CancellationToken ct)
    {
        switch (message.MessageType)
        {
            case nameof(ShiftBroadcastPayload):
                var broadcast = message.GetPayload<ShiftBroadcastPayload>();
                if (broadcast != null)
                    await smsService.SendShiftBroadcast(broadcast, ct);
                break;

            case nameof(InviteSmsPayload):
                var invite = message.GetPayload<InviteSmsPayload>();
                if (invite != null)
                    await smsService.SendInviteSms(invite, ct);
                break;

            case nameof(AdminInviteSmsPayload):
                var adminInvite = message.GetPayload<AdminInviteSmsPayload>();
                if (adminInvite != null)
                    await smsService.SendAdminInviteSms(adminInvite, ct);
                break;

            case nameof(ClaimConfirmationPayload):
                var confirmation = message.GetPayload<ClaimConfirmationPayload>();
                if (confirmation != null)
                    await smsService.SendClaimConfirmation(confirmation, ct);
                break;

            default:
                _logger.LogWarning(
                    "Unknown message type {MessageType} for message {MessageId}",
                    message.MessageType,
                    message.Id);
                // Mark as sent to avoid infinite retries for unknown types
                break;
        }
    }
}
