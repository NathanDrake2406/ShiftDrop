using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MulttenantSaas.Migrations
{
    /// <inheritdoc />
    public partial class AddPoolAdminPhoneNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PoolAdmins_PoolId_Email",
                table: "PoolAdmins");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "PoolAdmins");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "PoolAdmins",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_PoolId_PhoneNumber",
                table: "PoolAdmins",
                columns: new[] { "PoolId", "PhoneNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PoolAdmins_PoolId_PhoneNumber",
                table: "PoolAdmins");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "PoolAdmins");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "PoolAdmins",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_PoolAdmins_PoolId_Email",
                table: "PoolAdmins",
                columns: new[] { "PoolId", "Email" },
                unique: true);
        }
    }
}
