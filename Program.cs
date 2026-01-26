using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShiftDrop.Common.Services;
using ShiftDrop.Features;
using ShiftDrop.Features.Webhooks.SmsStatus;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
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
        policy.WithOrigins(allowedOrigins.Concat(new[] { "https://frontend-five-lovat-27.vercel.app" }).ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod());
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

var app = builder.Build();

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

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapSmsStatusWebhook();
app.MapFeatures();

app.Run();

// Make Program accessible for WebApplicationFactory in tests
public partial class Program { }
