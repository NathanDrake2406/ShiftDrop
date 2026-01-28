using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MulttenantSaas.Migrations
{
    /// <inheritdoc />
    public partial class InitialShiftDrop : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Pools",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ManagerAuth0Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pools", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Casuals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Auth0Id = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InviteToken = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    InviteExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InviteStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OptedOutAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OptOutToken = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Casuals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Casuals_Pools_PoolId",
                        column: x => x.PoolId,
                        principalTable: "Pools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PoolAdmins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Auth0Id = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    InviteToken = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    InvitedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InviteExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PoolAdmins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PoolAdmins_Pools_PoolId",
                        column: x => x.PoolId,
                        principalTable: "Pools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Shifts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartsAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SpotsNeeded = table.Column<int>(type: "int", nullable: false),
                    SpotsRemaining = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PoolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shifts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Shifts_Pools_PoolId",
                        column: x => x.PoolId,
                        principalTable: "Pools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CasualAvailability",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CasualId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DayOfWeek = table.Column<int>(type: "int", nullable: false),
                    FromTime = table.Column<TimeOnly>(type: "time", nullable: false),
                    ToTime = table.Column<TimeOnly>(type: "time", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CasualAvailability", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CasualAvailability_Casuals_CasualId",
                        column: x => x.CasualId,
                        principalTable: "Casuals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PushSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CasualId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    P256dh = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Auth = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PushSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PushSubscriptions_Casuals_CasualId",
                        column: x => x.CasualId,
                        principalTable: "Casuals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CasualId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClaimedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReleasedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftClaims_Casuals_CasualId",
                        column: x => x.CasualId,
                        principalTable: "Casuals",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShiftClaims_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShiftNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CasualId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimToken = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    TokenExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TokenStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftNotifications_Casuals_CasualId",
                        column: x => x.CasualId,
                        principalTable: "Casuals",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ShiftNotifications_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CasualAvailability_CasualId_DayOfWeek",
                table: "CasualAvailability",
                columns: new[] { "CasualId", "DayOfWeek" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Casuals_InviteToken",
                table: "Casuals",
                column: "InviteToken",
                unique: true,
                filter: "[InviteToken] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Casuals_OptOutToken",
                table: "Casuals",
                column: "OptOutToken",
                unique: true,
                filter: "[OptOutToken] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Casuals_PoolId_PhoneNumber",
                table: "Casuals",
                columns: new[] { "PoolId", "PhoneNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Status_NextRetryAt",
                table: "OutboxMessages",
                columns: new[] { "Status", "NextRetryAt" },
                filter: "[Status] = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_Auth0Id",
                table: "PoolAdmins",
                column: "Auth0Id",
                filter: "[Auth0Id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_InviteToken",
                table: "PoolAdmins",
                column: "InviteToken",
                unique: true,
                filter: "[InviteToken] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_PoolId_PhoneNumber",
                table: "PoolAdmins",
                columns: new[] { "PoolId", "PhoneNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pools_ManagerAuth0Id",
                table: "Pools",
                column: "ManagerAuth0Id");

            migrationBuilder.CreateIndex(
                name: "IX_PushSubscriptions_CasualId_Endpoint",
                table: "PushSubscriptions",
                columns: new[] { "CasualId", "Endpoint" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftClaims_CasualId",
                table: "ShiftClaims",
                column: "CasualId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftClaims_ShiftId_CasualId_Status",
                table: "ShiftClaims",
                columns: new[] { "ShiftId", "CasualId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftNotifications_CasualId",
                table: "ShiftNotifications",
                column: "CasualId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftNotifications_ClaimToken",
                table: "ShiftNotifications",
                column: "ClaimToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftNotifications_ShiftId_TokenStatus",
                table: "ShiftNotifications",
                columns: new[] { "ShiftId", "TokenStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_PoolId_Status_StartsAt",
                table: "Shifts",
                columns: new[] { "PoolId", "Status", "StartsAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CasualAvailability");

            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropTable(
                name: "PoolAdmins");

            migrationBuilder.DropTable(
                name: "PushSubscriptions");

            migrationBuilder.DropTable(
                name: "ShiftClaims");

            migrationBuilder.DropTable(
                name: "ShiftNotifications");

            migrationBuilder.DropTable(
                name: "Casuals");

            migrationBuilder.DropTable(
                name: "Shifts");

            migrationBuilder.DropTable(
                name: "Pools");
        }
    }
}
