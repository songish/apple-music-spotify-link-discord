"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPlatform = void 0;
const discord_js_1 = require("discord.js");
const index_1 = require("../index");
exports.addPlatform = {
    name: "addplatform",
    description: "Add a platform to automtically convert to your destination platform",
    defaultMemberPermissions: "ManageGuild",
    options: [
        {
            name: "platform",
            description: "The platform to add",
            type: discord_js_1.ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Apple Music",
                    value: "appleMusic",
                },
                {
                    name: "Spotify",
                    value: "spotify",
                },
                {
                    name: "YouTube",
                    value: "youtube",
                },
                {
                    name: "SoundCloud",
                    value: "soundcloud",
                },
                {
                    name: "Tidal",
                    value: "tidal",
                },
            ],
        },
    ],
    run: async (client, interaction) => {
        if (!interaction.guild)
            return;
        await index_1.prisma.server.update({
            where: {
                id: interaction.guild.id,
            },
            data: {
                // @ts-ignore bro idc
                enabledAutoConvertorPlatforms: {
                    push: interaction.options.get("platform")?.value,
                },
            },
        });
        return interaction.reply({
            content: `Added ${interaction.options.get("platform")?.value} to the list of platforms to automatically convert to.`,
            ephemeral: true,
        });
    },
};
