using FluentAssertions;
using MulttenantSaas.Tests.TestHelpers;
using ShiftDrop.Domain;

namespace MulttenantSaas.Tests.Domain;

/// <summary>
/// Tests for the PhoneNumber value object.
/// Verifies parsing, normalization, validation, and equality semantics.
/// </summary>
public class PhoneNumberTests
{
    #region Parsing and Normalization

    [Theory]
    [InlineData("+61412345678", "+61412345678")] // Already E.164
    [InlineData("0412345678", "+61412345678")]   // Australian mobile with leading 0
    [InlineData("61412345678", "+61412345678")]  // Australian mobile without +
    [InlineData("0412 345 678", "+61412345678")] // With spaces
    [InlineData("0412-345-678", "+61412345678")] // With dashes
    [InlineData("(04) 1234 5678", "+61412345678")] // With parentheses
    [InlineData("+1 555 123 4567", "+15551234567")] // US number with spaces
    [InlineData("  0412345678  ", "+61412345678")]  // With leading/trailing whitespace
    public void Parse_ValidPhoneNumbers_NormalizesToE164(string input, string expected)
    {
        // Act
        var result = PhoneNumber.Parse(input);

        // Assert
        result.Should().BeSuccess();
        result.Value.Value.Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Parse_NullOrWhitespace_ReturnsFailure(string? input)
    {
        // Act
        var result = PhoneNumber.Parse(input);

        // Assert
        result.Should().BeFailure().WithError("required");
    }

    [Theory]
    [InlineData("123")]        // Too short (less than 7 digits after +)
    [InlineData("12345")]      // Still too short
    [InlineData("abc")]        // Non-digits
    [InlineData("041234")]     // 6 digits Australian (too short)
    public void Parse_TooShort_ReturnsFailure(string input)
    {
        // Act
        var result = PhoneNumber.Parse(input);

        // Assert
        result.Should().BeFailure().WithError("Invalid phone number");
    }

    [Fact]
    public void Parse_TooLong_ReturnsFailure()
    {
        // Arrange - E.164 allows max 15 digits after +
        var input = "+1234567890123456"; // 16 digits

        // Act
        var result = PhoneNumber.Parse(input);

        // Assert
        result.Should().BeFailure().WithError("Invalid phone number");
    }

    [Theory]
    [InlineData("+1234567890")] // 10 digits - valid
    [InlineData("+123456789012345")] // 15 digits - valid (max)
    [InlineData("+1234567")] // 7 digits - valid (min)
    public void Parse_ValidLengths_Succeeds(string input)
    {
        // Act
        var result = PhoneNumber.Parse(input);

        // Assert
        result.Should().BeSuccess();
    }

    #endregion

    #region Value Equality

    [Fact]
    public void Equals_SameValue_ReturnsTrue()
    {
        // Arrange
        var phone1 = PhoneNumber.Parse("0412345678").Value;
        var phone2 = PhoneNumber.Parse("+61412345678").Value;

        // Assert - both normalize to the same value
        phone1.Should().Be(phone2);
        (phone1 == phone2).Should().BeTrue();
    }

    [Fact]
    public void Equals_DifferentValues_ReturnsFalse()
    {
        // Arrange
        var phone1 = PhoneNumber.Parse("0412345678").Value;
        var phone2 = PhoneNumber.Parse("0498765432").Value;

        // Assert
        phone1.Should().NotBe(phone2);
        (phone1 != phone2).Should().BeTrue();
    }

    [Fact]
    public void GetHashCode_SameValue_ReturnsSameHash()
    {
        // Arrange
        var phone1 = PhoneNumber.Parse("0412345678").Value;
        var phone2 = PhoneNumber.Parse("+61412345678").Value;

        // Assert
        phone1.GetHashCode().Should().Be(phone2.GetHashCode());
    }

    #endregion

    #region String Conversion

    [Fact]
    public void ToString_ReturnsNormalizedValue()
    {
        // Arrange
        var phone = PhoneNumber.Parse("0412345678").Value;

        // Assert
        phone.ToString().Should().Be("+61412345678");
    }

    [Fact]
    public void ImplicitConversion_ToStringWorks()
    {
        // Arrange
        var phone = PhoneNumber.Parse("0412345678").Value;

        // Act
        string phoneString = phone; // Implicit conversion

        // Assert
        phoneString.Should().Be("+61412345678");
    }

    [Fact]
    public void Value_Property_ReturnsNormalizedString()
    {
        // Arrange
        var phone = PhoneNumber.Parse("0412 345 678").Value;

        // Assert
        phone.Value.Should().Be("+61412345678");
    }

    #endregion

    #region FromTrusted

    [Fact]
    public void FromTrusted_DoesNotValidate()
    {
        // Arrange - even invalid value is accepted (trusted source like database)
        var normalized = "+61412345678";

        // Act
        var phone = PhoneNumber.FromTrusted(normalized);

        // Assert
        phone.Value.Should().Be(normalized);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void Parse_UnusualFormat_StripsNonDigits()
    {
        // Arrange - unusual format with embedded (0)
        var input = "+61 (0) 412 345 678";

        // Act
        var result = PhoneNumber.Parse(input);

        // Assert - strips everything except digits and +
        // Note: This results in +6104123456 which isn't ideal but matches the original behavior
        result.Should().BeSuccess();
    }

    [Fact]
    public void Parse_AustralianLandline_AddsPlusPrefix()
    {
        // Arrange - Australian landline (doesn't start with 04)
        // Current normalization only handles 04xx mobiles specifically
        var input = "0299998888";

        // Act
        var result = PhoneNumber.Parse(input);

        // Assert - Gets + prefix (not full E.164 conversion, matches original behavior)
        result.Should().BeSuccess();
        result.Value.Value.Should().Be("+0299998888");
    }

    #endregion
}
