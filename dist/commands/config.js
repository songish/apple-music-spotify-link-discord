"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configCommand = void 0;
const discord_js_1 = require("discord.js");
const index_js_1 = require("../index.js");
exports.configCommand = {
    name: "config",
    description: "See your current config.",
    defaultMemberPermissions: "ManageGuild",
    run: async (client, interaction) => {
        if (!interaction.guild)
            return;
        const server = await index_js_1.prisma.server.findFirst({
            where: { id: interaction.guild.id },
        });
        if (!server) {
            await index_js_1.prisma.server.create({
                data: {
                    id: interaction.guild.id,
                    destinationPlatform: "spotify",
                    enabledAutoConvertorPlatforms: ["appleMusic"],
                },
            });
            return interaction.reply({
                content: "the server didn't exist in our database yet, just insertted your server!",
                ephemeral: true,
            });
        }
        return interaction.reply({
            embeds: [
                new discord_js_1.EmbedBuilder().setDescription(`destination platform: **${server.destinationPlatform}**\n` +
                    `enabled auto-convert platforms: **${server.enabledAutoConvertorPlatforms.join(", ")}**\n` +
                    `\n` +
                    "**raw data**\n" +
                    `\`\`\`json\n${JSON.stringify(server, null, 2)}\`\`\``),
            ],
            ephemeral: true,
        });
    },
};
