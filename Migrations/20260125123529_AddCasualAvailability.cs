using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MulttenantSaas.Migrations
{
    /// <inheritdoc />
    public partial class AddCasualAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CasualAvailability",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CasualId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    FromTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    ToTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_CasualAvailability_CasualId_DayOfWeek",
                table: "CasualAvailability",
                columns: new[] { "CasualId", "DayOfWeek" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CasualAvailability");
        }
    }
}
