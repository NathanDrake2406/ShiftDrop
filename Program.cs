using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;
using ShiftDrop.Common.Services;
using ShiftDrop.Features;
using ShiftDrop.Features.Webhooks.SmsStatus;

// Configure Serilog before anything else
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .Enrich.WithThreadId()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting ShiftDrop API");

var builder = WebApplication.CreateBuilder(args);

// Use Serilog for all logging
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .Enrich.WithThreadId()
    .Enrich.WithProperty("Application", "ShiftDrop")
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Problem Details for consistent error responses (RFC 7807)
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
    };
});
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());

    // Production CORS - allow Vercel frontend and configurable origins
    var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        ?? Array.Empty<string>();

    options.AddPolicy("ProdCors", policy =>
        policy.WithOrigins(allowedOrigins.Concat(new[] { "https://shift-drop.vercel.app", "https://frontend-five-lovat-27.vercel.app" }).ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// Rate limiting to prevent abuse
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global policy: 100 requests per minute per IP
    options.AddPolicy("fixed", httpContext =>
    {
        // Check if rate limiting is disabled (e.g., in tests) at request time
        var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var disabled = config.GetValue<bool>("RateLimiting:Disabled");
        var limit = disabled ? int.MaxValue : 100;

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0 // Reject immediately when limit reached
            });
    });

    // Strict policy for anonymous endpoints: 20 requests per minute
    options.AddPolicy("strict", httpContext =>
    {
        var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var disabled = config.GetValue<bool>("RateLimiting:Disabled");
        var limit = disabled ? int.MaxValue : 20;

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    // SMS-sending endpoints: 5 per minute per user (prevents spam/accidents)
    // Keyed by authenticated user ID to prevent abuse regardless of IP
    options.AddPolicy("sms-send", httpContext =>
    {
        var config = httpContext.RequestServices.GetRequiredService<IConfiguration>();
        var disabled = config.GetValue<bool>("RateLimiting:Disabled");
        var limit = disabled ? int.MaxValue : 5;

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });
});

// SMS service: Use Twilio if configured, otherwise Console (logs only)
var twilioConfigured = !string.IsNullOrEmpty(builder.Configuration["Twilio:AccountSid"]);
if (twilioConfigured)
{
    builder.Services.AddScoped<ISmsService, TwilioSmsService>();
}
else
{
    builder.Services.AddScoped<ISmsService, ConsoleSmsService>();
}

builder.Services.AddHostedService<OutboxProcessor>();

// Push notification service
builder.Services.Configure<WebPushOptions>(builder.Configuration.GetSection("WebPush"));
builder.Services.AddScoped<IPushNotificationService, WebPushNotificationService>();

builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth0:Authority"];
        options.Audience = builder.Configuration["Auth0:Audience"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Health checks with DB connectivity
builder.Services.AddHealthChecks()
    .AddNpgSql(
        builder.Configuration.GetConnectionString("DefaultConnection") ?? "",
        name: "postgresql",
        tags: ["db", "ready"]);

var app = builder.Build();

// Global exception handler - returns Problem Details (RFC 7807)
app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var exceptionFeature = context.Features.Get<IExceptionHandlerFeature>();
        var exception = exceptionFeature?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        logger.LogError(exception, "Unhandled exception occurred. TraceId: {TraceId}", context.TraceIdentifier);

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred",
            Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = context.TraceIdentifier }
        };

        // Don't expose exception details in production
        if (app.Environment.IsDevelopment())
        {
            problemDetails.Detail = exception?.Message;
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});

// Structured request logging
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
    };
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevCors");
}
else
{
    app.UseHttpsRedirection();
    app.UseCors("ProdCors");
}
app.UseAuthentication();
app.UseAuthorization();

// Rate limiting (must run after authentication so sms-send policy can access User claims)
app.UseRateLimiter();

// Health endpoints
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                duration = e.Value.Duration.TotalMilliseconds
            })
        };
        await context.Response.WriteAsJsonAsync(result);
    }
}).AllowAnonymous();

// Simple liveness check (no dependencies)
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" })).AllowAnonymous();
app.MapSmsStatusWebhook();
app.MapFeatures();

app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    throw; // Re-throw so tests can see startup failures
}
finally
{
    Log.CloseAndFlush();
}

// Make Program accessible for WebApplicationFactory in tests
public partial class Program { }
