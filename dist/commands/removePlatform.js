"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePlatform = void 0;
const discord_js_1 = require("discord.js");
const __1 = require("..");
exports.removePlatform = {
    name: "removeplatform",
    description: "Remove a platform to automtically convert to your destination platform",
    defaultMemberPermissions: "ManageGuild",
    options: [
        {
            name: "platform",
            description: "The platform to remove",
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
        const serverConfig = await __1.prisma.server.findUnique({
            where: {
                id: interaction.guild.id,
            },
            select: {
                enabledAutoConvertorPlatforms: true,
            },
        });
        if (!serverConfig)
            return;
        const newConvertorPlatforms = serverConfig.enabledAutoConvertorPlatforms.filter((platform) => platform !== interaction.options.get("platform")?.value);
        await __1.prisma.server.update({
            where: {
                id: interaction.guild.id,
            },
            data: {
                enabledAutoConvertorPlatforms: newConvertorPlatforms,
            },
        });
        return interaction.reply({
            content: `Removed ${interaction.options.get("platform")?.value} from the list of platforms to automatically convert to.`,
            ephemeral: true,
        });
    },
};
