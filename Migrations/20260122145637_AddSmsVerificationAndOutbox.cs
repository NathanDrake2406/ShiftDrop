using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MulttenantSaas.Migrations
{
    /// <inheritdoc />
    public partial class AddSmsVerificationAndOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Auth0Id",
                table: "Casuals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "InviteExpiresAt",
                table: "Casuals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InviteStatus",
                table: "Casuals",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InviteToken",
                table: "Casuals",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptOutToken",
                table: "Casuals",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OptedOutAt",
                table: "Casuals",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MessageType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    NextRetryAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ShiftNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    CasualId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimToken = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TokenStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftNotifications_Casuals_CasualId",
                        column: x => x.CasualId,
                        principalTable: "Casuals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftNotifications_Shifts_ShiftId",
                        column: x => x.ShiftId,
                        principalTable: "Shifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Casuals_InviteToken",
                table: "Casuals",
                column: "InviteToken",
                unique: true,
                filter: "\"InviteToken\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Casuals_OptOutToken",
                table: "Casuals",
                column: "OptOutToken",
                unique: true,
                filter: "\"OptOutToken\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Status_NextRetryAt",
                table: "OutboxMessages",
                columns: new[] { "Status", "NextRetryAt" },
                filter: "\"Status\" = 'Pending'");

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OutboxMessages");

            migrationBuilder.DropTable(
                name: "ShiftNotifications");

            migrationBuilder.DropIndex(
                name: "IX_Casuals_InviteToken",
                table: "Casuals");

            migrationBuilder.DropIndex(
                name: "IX_Casuals_OptOutToken",
                table: "Casuals");

            migrationBuilder.DropColumn(
                name: "Auth0Id",
                table: "Casuals");

            migrationBuilder.DropColumn(
                name: "InviteExpiresAt",
                table: "Casuals");

            migrationBuilder.DropColumn(
                name: "InviteStatus",
                table: "Casuals");

            migrationBuilder.DropColumn(
                name: "InviteToken",
                table: "Casuals");

            migrationBuilder.DropColumn(
                name: "OptOutToken",
                table: "Casuals");

            migrationBuilder.DropColumn(
                name: "OptedOutAt",
                table: "Casuals");
        }
    }
}
