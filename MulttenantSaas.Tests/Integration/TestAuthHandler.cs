using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MulttenantSaas.Tests.Integration;

/// <summary>
/// Test authentication handler that reads the user ID from X-Test-User-Id header.
/// This bypasses real Auth0 JWT validation for integration tests.
/// </summary>
public class TestAuthHandler : AuthenticationHandler<TestAuthHandler.TestAuthOptions>
{
    public const string SchemeName = "TestScheme";
    public const string UserIdHeader = "X-Test-User-Id";

    public TestAuthHandler(
        IOptionsMonitor<TestAuthOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // If no test user header is present, fail authentication (simulates unauthenticated request)
        if (!Request.Headers.TryGetValue(UserIdHeader, out var userIdValues))
        {
            return Task.FromResult(AuthenticateResult.Fail("No test user header present"));
        }

        var userId = userIdValues.FirstOrDefault();
        if (string.IsNullOrEmpty(userId))
        {
            return Task.FromResult(AuthenticateResult.Fail("Empty test user header"));
        }

        // Create claims matching what Auth0 JWT would provide
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("sub", userId), // Auth0 uses 'sub' claim
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    public class TestAuthOptions : AuthenticationSchemeOptions
    {
    }
}
