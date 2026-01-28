namespace ShiftDrop.Domain;

/// <summary>
/// Value object representing a validated, normalized phone number in E.164 format.
/// Guarantees that any PhoneNumber instance contains a valid, normalized value.
/// </summary>
public readonly record struct PhoneNumber
{
    /// <summary>
    /// The normalized phone number in E.164 format (e.g., "+61412345678").
    /// </summary>
    public string Value { get; }

    private PhoneNumber(string normalized)
    {
        Value = normalized;
    }

    /// <summary>
    /// Parses a raw phone number string into a validated PhoneNumber.
    /// Handles Australian numbers: 0412345678 → +61412345678
    /// </summary>
    public static Result<PhoneNumber> Parse(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return Result<PhoneNumber>.Failure("Phone number is required");

        var normalized = Normalize(raw.Trim());

        if (!IsValid(normalized))
            return Result<PhoneNumber>.Failure("Invalid phone number format");

        return Result<PhoneNumber>.Success(new PhoneNumber(normalized));
    }

    /// <summary>
    /// Creates a PhoneNumber from a trusted, already-normalized value (e.g., from database).
    /// Use only when you're certain the value is already in E.164 format.
    /// </summary>
    internal static PhoneNumber FromTrusted(string normalized)
    {
        return new PhoneNumber(normalized);
    }

    /// <summary>
    /// Normalizes phone numbers to E.164 format for Twilio.
    /// Handles Australian numbers: 0412345678 → +61412345678
    /// </summary>
    private static string Normalize(string phone)
    {
        // Remove spaces, dashes, parentheses - keep only digits and +
        var digits = new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());

        // Already in E.164 format
        if (digits.StartsWith('+'))
            return digits;

        // Australian mobile starting with 04xx → +614xx
        if (digits.StartsWith("04") && digits.Length == 10)
            return "+61" + digits[1..];

        // Australian number without leading 0 (e.g., 61412345678)
        if (digits.StartsWith("61") && digits.Length == 11)
            return "+" + digits;

        // Assume it needs a + prefix
        return "+" + digits;
    }

    /// <summary>
    /// Validates that the normalized number is in valid E.164 format.
    /// E.164 format: + followed by 7-15 digits.
    /// </summary>
    private static bool IsValid(string normalized)
    {
        if (string.IsNullOrEmpty(normalized))
            return false;

        if (!normalized.StartsWith('+'))
            return false;

        var digits = normalized[1..];

        // E.164 allows 7-15 digits after the +
        if (digits.Length < 7 || digits.Length > 15)
            return false;

        // All remaining characters must be digits
        return digits.All(char.IsDigit);
    }

    /// <summary>
    /// Implicit conversion to string for convenience when passing to SMS services, etc.
    /// </summary>
    public static implicit operator string(PhoneNumber phone) => phone.Value;

    public override string ToString() => Value;
}
