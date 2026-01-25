using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MulttenantSaas.Migrations
{
    /// <inheritdoc />
    public partial class AddPoolAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PoolAdmins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Auth0Id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    InviteToken = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    InvitedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InviteExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_Auth0Id",
                table: "PoolAdmins",
                column: "Auth0Id",
                filter: "\"Auth0Id\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_InviteToken",
                table: "PoolAdmins",
                column: "InviteToken",
                unique: true,
                filter: "\"InviteToken\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_PoolId_Email",
                table: "PoolAdmins",
                columns: new[] { "PoolId", "Email" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PoolAdmins");
        }
    }
}
