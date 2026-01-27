using System.Text.Json;

namespace ShiftDrop.Domain;

/// <summary>
/// Outbox pattern for reliable SMS delivery.
/// Messages are persisted in the same transaction as domain changes,
/// then processed asynchronously by a background worker.
/// </summary>
public class OutboxMessage
{
    private static readonly TimeSpan[] RetryDelays =
    [
        TimeSpan.FromSeconds(10),
        TimeSpan.FromSeconds(30),
        TimeSpan.FromMinutes(1),
        TimeSpan.FromMinutes(5),
        TimeSpan.FromMinutes(15),
    ];

    public Guid Id { get; private set; }
    public string MessageType { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public OutboxStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? ProcessedAt { get; private set; }
    public int RetryCount { get; private set; }
    public DateTime? NextRetryAt { get; private set; }
    public string? LastError { get; private set; }

    private OutboxMessage() { }

    public static OutboxMessage Create<T>(T payload, TimeProvider timeProvider) where T : notnull
    {
        return new OutboxMessage
        {
            Id = Guid.NewGuid(),
            MessageType = typeof(T).Name,
            Payload = JsonSerializer.Serialize(payload),
            Status = OutboxStatus.Pending,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
            RetryCount = 0,
        };
    }

    /// <summary>
    /// Deserializes the payload to the specified type.
    /// </summary>
    public T? GetPayload<T>() where T : class
    {
        return JsonSerializer.Deserialize<T>(Payload);
    }

    /// <summary>
    /// Marks the message as successfully sent.
    /// </summary>
    public void MarkAsSent(TimeProvider timeProvider)
    {
        Status = OutboxStatus.Sent;
        ProcessedAt = timeProvider.GetUtcNow().UtcDateTime;
    }

    /// <summary>
    /// Marks the message as failed with exponential backoff for retry.
    /// </summary>
    public void MarkAsFailed(string error, TimeProvider timeProvider)
    {
        LastError = error;
        RetryCount++;

        if (RetryCount >= RetryDelays.Length)
        {
            Status = OutboxStatus.Failed;
            ProcessedAt = timeProvider.GetUtcNow().UtcDateTime;
        }
        else
        {
            var delay = RetryDelays[RetryCount - 1];
            NextRetryAt = timeProvider.GetUtcNow().UtcDateTime.Add(delay);
        }
    }

    /// <summary>
    /// Cancels a pending message (e.g., shift was cancelled before SMS sent).
    /// </summary>
    public void Cancel()
    {
        if (Status == OutboxStatus.Pending)
        {
            Status = OutboxStatus.Cancelled;
        }
    }

    /// <summary>
    /// Checks if the message is ready to be processed.
    /// </summary>
    public bool IsReadyForProcessing(TimeProvider timeProvider)
    {
        if (Status != OutboxStatus.Pending)
            return false;

        if (NextRetryAt.HasValue && timeProvider.GetUtcNow().UtcDateTime < NextRetryAt.Value)
            return false;

        return true;
    }
}

public enum OutboxStatus
{
    Pending,
    Sent,
    Failed,
    Cancelled,
}

// Message payload types for SMS
public record ShiftBroadcastPayload(
    Guid ShiftNotificationId,
    string PhoneNumber,
    string ShiftDescription,
    string ClaimUrl
);

public record InviteSmsPayload(
    Guid CasualId,
    string PhoneNumber,
    string CasualName,
    string PoolName,
    string VerifyUrl
);

public record AdminInviteSmsPayload(
    Guid PoolAdminId,
    string PhoneNumber,
    string AdminName,
    string PoolName,
    string AcceptUrl
);

public record ClaimConfirmationPayload(
    Guid ShiftClaimId,
    string PhoneNumber,
    string ShiftDescription
);

public record ShiftReopenedPayload(
    Guid ShiftNotificationId,
    string PhoneNumber,
    string ShiftDescription,
    string ClaimUrl
);
