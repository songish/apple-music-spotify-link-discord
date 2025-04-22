"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDestinationPlatform = void 0;
const discord_js_1 = require("discord.js");
const __1 = require("..");
exports.setDestinationPlatform = {
    name: "setdestinationplatform",
    description: "Set a different destination platform.",
    defaultMemberPermissions: "ManageGuild",
    options: [
        {
            name: "platform",
            description: "The platform to select",
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
        const newDestinationPlatform = interaction.options.get("platform")
            ?.value;
        if (!newDestinationPlatform)
            return;
        await __1.prisma.server.update({
            where: {
                id: interaction.guild.id,
            },
            data: {
                // @ts-ignore bro idc
                destinationPlatform: newDestinationPlatform,
            },
        });
        return interaction.reply({
            content: `Selected ${interaction.options.get("platform")?.value} as the destination platform to convert to.`,
            ephemeral: true,
        });
    },
};
