"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// Require the necessary discord.js classes
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const addPlatform_1 = require("./commands/addPlatform");
const config_1 = require("./commands/config");
const destinationPlatform_1 = require("./commands/destinationPlatform");
const removePlatform_1 = require("./commands/removePlatform");
dotenv_1.default.config();
exports.prisma = new client_1.PrismaClient();
// Create a new client instance
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMessages,
    ],
});
// Right click context menu interactions
const contextAppleMusic = new discord_js_1.ContextMenuCommandBuilder()
    .setName("Convert To Apple Music")
    .setType(discord_js_1.ApplicationCommandType.Message);
const contextSpotify = new discord_js_1.ContextMenuCommandBuilder()
    .setName("Convert To Spotify")
    .setType(discord_js_1.ApplicationCommandType.Message);
const contextYoutube = new discord_js_1.ContextMenuCommandBuilder()
    .setName("Convert To YouTube")
    .setType(discord_js_1.ApplicationCommandType.Message);
const contextSoundcloud = new discord_js_1.ContextMenuCommandBuilder()
    .setName("Convert To SoundCloud")
    .setType(discord_js_1.ApplicationCommandType.Message);
const contextTidal = new discord_js_1.ContextMenuCommandBuilder()
    .setName("Convert To Tidal")
    .setType(discord_js_1.ApplicationCommandType.Message);
async function convert_link(link, platform) {
    const apiRequest = await fetch(`https://api.song.link/v1-alpha.1/links?url=${link}&userCountry=US&songIfSingle=true`);
    const data = (await apiRequest.json());
    if (data.linksByPlatform === undefined) {
        return null;
    }
    const platformLink = data.linksByPlatform[platform];
    if (platformLink === undefined) {
        return null;
    }
    return platformLink.url;
}
const slashCommands = [
    addPlatform_1.addPlatform,
    removePlatform_1.removePlatform,
    destinationPlatform_1.setDestinationPlatform,
    config_1.configCommand,
];
// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(discord_js_1.Events.ClientReady, async (readyClient) => {
    let guildsForDb = [];
    client.guilds.cache.map((guild) => {
        guildsForDb.push({
            id: guild.id,
            destinationPlatform: "spotify",
            enabledAutoConvertorPlatforms: ["appleMusic"],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });
    await exports.prisma.server.createMany({
        data: guildsForDb,
        skipDuplicates: true,
    });
    await readyClient.application.commands.set([
        contextAppleMusic,
        contextSpotify,
        contextYoutube,
        contextSoundcloud,
        contextTidal,
        ...slashCommands,
    ]);
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
async function handleContextMenus(interaction, platform) {
    const link = interaction.targetMessage.content.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/);
    if (!link) {
        return;
    }
    const convertedLink = await convert_link(link[0], platform);
    if (convertedLink === null) {
        return;
    }
    await interaction.reply({
        content: `${convertedLink}`,
        allowedMentions: {
            parse: [],
            repliedUser: false,
        },
    });
}
const handleSlashCommand = async (client, interaction) => {
    const slashCommand = slashCommands.find((c) => c.name === interaction.commandName);
    if (!slashCommand) {
        interaction.reply({ content: "An error has occurred" });
        return;
    }
    slashCommand.run(client, interaction);
};
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    if (interaction.isMessageContextMenuCommand()) {
        if (interaction.commandName === contextAppleMusic.name) {
            await handleContextMenus(interaction, "appleMusic");
        }
        if (interaction.commandName === contextSpotify.name) {
            await handleContextMenus(interaction, "spotify");
        }
        if (interaction.commandName === contextYoutube.name) {
            await handleContextMenus(interaction, "youtube");
        }
        if (interaction.commandName === contextSoundcloud.name) {
            await handleContextMenus(interaction, "soundcloud");
        }
        if (interaction.commandName === contextTidal.name) {
            await handleContextMenus(interaction, "tidal");
        }
    }
    else if (interaction.isCommand() &&
        interaction.isMessageContextMenuCommand() === false) {
        await handleSlashCommand(client, interaction);
    }
});
client.on(discord_js_1.Events.GuildCreate, async (guild) => {
    await exports.prisma.server.create({
        data: {
            id: guild.id,
            destinationPlatform: "spotify",
            enabledAutoConvertorPlatforms: ["appleMusic"],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
});
client.on(discord_js_1.Events.MessageCreate, async (message) => {
    if (!message.guild)
        return;
    let serverConfig = await exports.prisma.server.findUnique({
        where: {
            id: message.guild.id,
        },
    });
    if (!serverConfig) {
        serverConfig = {
            id: message.guild.id,
            destinationPlatform: "spotify",
            enabledAutoConvertorPlatforms: ["appleMusic"],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    if (serverConfig.enabledAutoConvertorPlatforms.includes("appleMusic") &&
        message.content.includes("https://music.apple.com")) {
        const link = message.content.match(/https?:\/\/(?:itunes\.apple\.com\/|music\.apple\.com\/)(?:[^\/]+\/)?(?:album|artist|song|album\/[^\/]+\/\w+)(?:\/[^\/]+)?\/\d+(?:\?[^\/\s]*)?/);
        if (!link)
            return;
        const convertedLink = await convert_link(link.toString(), serverConfig.destinationPlatform ?? "spotify");
        if (convertedLink === null) {
            return;
        }
        await message.reply({
            content: `${convertedLink}`,
            flags: [4096],
            options: {
                allowedMentions: {
                    parse: [],
                    repliedUser: false,
                },
            },
        });
    }
    if (serverConfig.enabledAutoConvertorPlatforms.includes("tidal") &&
        (message.content.includes("https://listen.tidal.com") ||
            message.content.includes("https://tidal.com"))) {
        const link = message.content.match(/https:\/\/(?:listen\.tidal\.com|tidal\.com\/browse)\/(?:album|track)\/(\d+)(?:\/track\/(\d+))?/);
        if (!link)
            return;
        const convertedLink = await convert_link(link[0], serverConfig.destinationPlatform ?? "spotify");
        if (convertedLink === null) {
            return;
        }
        await message.reply({
            content: `${convertedLink}`,
            flags: [4096],
            options: {
                allowedMentions: {
                    parse: [],
                    repliedUser: false,
                },
            },
        });
    }
    if (serverConfig.enabledAutoConvertorPlatforms.includes("spotify") &&
        message.content.includes("https://open.spotify.com")) {
        const link = message.content.match(/https?:\/\/open\.spotify\.com\/(track|album)\/\w+/);
        if (!link)
            return;
        const convertedLink = await convert_link(link[0], serverConfig.destinationPlatform ?? "spotify");
        if (convertedLink === null) {
            return;
        }
        await message.reply({
            content: `${convertedLink}`,
            flags: [4096],
            options: {
                allowedMentions: {
                    parse: [],
                    repliedUser: false,
                },
            },
        });
    }
    if (serverConfig.enabledAutoConvertorPlatforms.includes("soundcloud") &&
        message.content.includes("https://soundcloud.com")) {
        const link = message.content.match(/https?:\/\/soundcloud\.com\/[^\/]+\/[^\/]+/);
        if (!link)
            return;
        const convertedLink = await convert_link(link[0], serverConfig.destinationPlatform ?? "spotify");
        if (convertedLink === null) {
            return;
        }
        await message.reply({
            content: `${convertedLink}`,
            flags: [4096],
            options: {
                allowedMentions: {
                    parse: [],
                    repliedUser: false,
                },
            },
        });
    }
    if (serverConfig.enabledAutoConvertorPlatforms.includes("youtube") &&
        message.content.includes("https://youtube.com")) {
        const link = message.content.match(/https?:\/\/www\.youtube\.com\/watch\?v=[^&]+/);
        if (!link)
            return;
        const convertedLink = await convert_link(link[0], serverConfig.destinationPlatform ?? "spotify");
        if (convertedLink === null) {
            return;
        }
        await message.reply({
            content: `${convertedLink}`,
            flags: [4096],
            options: {
                allowedMentions: {
                    parse: [],
                    repliedUser: false,
                },
            },
        });
    }
});
// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
