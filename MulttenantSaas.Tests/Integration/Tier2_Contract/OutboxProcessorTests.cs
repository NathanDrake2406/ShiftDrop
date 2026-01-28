using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ShiftDrop.Common.Services;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Integration.Tier2_Contract;

public class OutboxProcessorTests : IntegrationTestBase
{
    public OutboxProcessorTests(ShiftDropWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task ProcessMessage_WithUnknownMessageType_RecordsError()
    {
        // Arrange: Create an outbox message with unknown type using raw SQL
        // (can't use factory method since it derives type from T)
        var messageId = Guid.NewGuid();
        var createdAt = TimeProvider.GetUtcNow().UtcDateTime;

        await ExecuteDbAsync(async db =>
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO "OutboxMessages" ("Id", "MessageType", "Payload", "Status", "CreatedAt", "RetryCount")
                VALUES ({0}, {1}, {2}, {3}, {4}, {5})
                """,
                messageId,
                "UnknownPayloadType",
                "{}",
                "Pending",  // Status is stored as string, not int
                createdAt,
                0);
        });

        // Act: Directly invoke ProcessPendingMessages
        // (OutboxProcessor background service is disabled in test factory)
        using var scope = Factory.Services.CreateScope();
        var scopeFactory = scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<OutboxProcessor>>();

        var processor = new OutboxProcessor(scopeFactory, logger);
        await processor.ProcessPendingMessages(CancellationToken.None);

        // Assert: Message should have been processed (marked with error, retry count increased)
        var message = await QueryDbAsync(db =>
            db.OutboxMessages.FirstOrDefaultAsync(m => m.Id == messageId));

        Assert.NotNull(message);
        Assert.Equal(1, message.RetryCount);
        Assert.NotNull(message.LastError);
        Assert.Contains("Unknown message type", message.LastError);
    }

    [Fact]
    public async Task ProcessMessage_WithUnknownMessageType_EventuallyMarksAsFailed()
    {
        // Arrange: Create an outbox message with unknown type
        var messageId = Guid.NewGuid();
        var createdAt = TimeProvider.GetUtcNow().UtcDateTime;

        await ExecuteDbAsync(async db =>
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO "OutboxMessages" ("Id", "MessageType", "Payload", "Status", "CreatedAt", "RetryCount")
                VALUES ({0}, {1}, {2}, {3}, {4}, {5})
                """,
                messageId,
                "UnknownPayloadType",
                "{}",
                "Pending",
                createdAt,
                0);
        });

        // Act: Process multiple times to exhaust retries (5 retries before Failed)
        using var scope = Factory.Services.CreateScope();
        var scopeFactory = scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<OutboxProcessor>>();
        var processor = new OutboxProcessor(scopeFactory, logger);

        // Process 6 times - need to advance time past NextRetryAt for each attempt
        for (int i = 0; i < 6; i++)
        {
            Factory.FakeTimeProvider.Advance(TimeSpan.FromMinutes(20));
            await processor.ProcessPendingMessages(CancellationToken.None);
        }

        // Assert: Message should be permanently failed after max retries
        var message = await QueryDbAsync(db =>
            db.OutboxMessages.FirstOrDefaultAsync(m => m.Id == messageId));

        Assert.NotNull(message);
        Assert.Equal(OutboxStatus.Failed, message.Status);
        Assert.Contains("Unknown message type", message.LastError);
    }
}
