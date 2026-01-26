// Domain/PushSubscription.cs
namespace ShiftDrop.Domain;

public class PushSubscription
{
    public Guid Id { get; private set; }
    public Guid CasualId { get; private set; }
    public Casual Casual { get; private set; } = null!;
    public string Endpoint { get; private set; } = null!;
    public string P256dh { get; private set; } = null!;
    public string Auth { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastUsedAt { get; private set; }
    public bool IsActive { get; private set; }

    private PushSubscription() { }

    public static PushSubscription Create(
        Casual casual,
        string endpoint,
        string p256dh,
        string auth,
        TimeProvider timeProvider)
    {
        return new PushSubscription
        {
            Id = Guid.NewGuid(),
            CasualId = casual.Id,
            Casual = casual,
            Endpoint = endpoint,
            P256dh = p256dh,
            Auth = auth,
            CreatedAt = timeProvider.GetUtcNow().UtcDateTime,
            IsActive = true
        };
    }

    public void MarkUsed(TimeProvider timeProvider)
    {
        LastUsedAt = timeProvider.GetUtcNow().UtcDateTime;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}
