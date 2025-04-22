// Require the necessary discord.js classes
import {
  ApplicationCommandType,
  CacheType,
  Client,
  CommandInteraction,
  ContextMenuCommandBuilder,
  Events,
  GatewayIntentBits,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { PrismaClient, Server } from "@prisma/client";
import dotenv from "dotenv";
import { addPlatform } from "./commands/addPlatform";
import { configCommand } from "./commands/config";
import { setDestinationPlatform } from "./commands/destinationPlatform";
import { removePlatform } from "./commands/removePlatform";
import { Command } from "./utils/command";
dotenv.config();

export const prisma = new PrismaClient();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

// Right click context menu interactions
const contextAppleMusic = new ContextMenuCommandBuilder()
  .setName("Convert To Apple Music")
  .setType(ApplicationCommandType.Message);
const contextSpotify = new ContextMenuCommandBuilder()
  .setName("Convert To Spotify")
  .setType(ApplicationCommandType.Message);
const contextYoutube = new ContextMenuCommandBuilder()
  .setName("Convert To YouTube")
  .setType(ApplicationCommandType.Message);
const contextSoundcloud = new ContextMenuCommandBuilder()
  .setName("Convert To SoundCloud")
  .setType(ApplicationCommandType.Message);
const contextTidal = new ContextMenuCommandBuilder()
  .setName("Convert To Tidal")
  .setType(ApplicationCommandType.Message);

async function convert_link(link: string, platform: string) {
  try {
    const apiRequest = await fetch(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(
        link
      )}&userCountry=US&songIfSingle=true`
    );

    if (!apiRequest.ok) {
      console.error(
        `API request failed: ${apiRequest.status} ${apiRequest.statusText}`
      );
      return null;
    }

    const data = await apiRequest.json();

    if (!data || data.linksByPlatform === undefined) {
      console.error("No links found in API response");
      return null;
    }

    const platformLink = data.linksByPlatform[platform];
    if (!platformLink || !platformLink.url) {
      console.error(`No ${platform} link found for the given URL`);
      return null;
    }

    return platformLink.url;
  } catch (error) {
    console.error("Error converting link:", error);
    return null;
  }
}

const slashCommands: Command[] = [
  addPlatform,
  removePlatform,
  setDestinationPlatform,
  configCommand,
];

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async (readyClient) => {
  let guildsForDb = [] as Server[];
  client.guilds.cache.map((guild) => {
    guildsForDb.push({
      id: guild.id,
      destinationPlatform: "spotify",
      enabledAutoConvertorPlatforms: ["appleMusic"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  await prisma.server.createMany({
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

async function handleContextMenus(
  interaction: MessageContextMenuCommandInteraction<CacheType>,
  platform: string
) {
  try {
    const link = interaction.targetMessage.content.match(
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
    );

    if (!link) {
      await interaction.reply({
        content: "No valid link found in the message.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const convertedLink = await convert_link(link[0], platform);
    if (!convertedLink) {
      await interaction.editReply({
        content: `Sorry, I couldn't find a ${platform} link for this song. The song might not be available on ${platform}.`,
      });
      return;
    }

    await interaction.editReply({
      content: convertedLink,
      allowedMentions: {
        parse: [],
        repliedUser: false,
      },
    });
  } catch (error) {
    console.error("Error in handleContextMenus:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Sorry, something went wrong while processing your request.",
        ephemeral: true,
      });
    } else {
      await interaction.editReply({
        content: "Sorry, something went wrong while processing your request.",
      });
    }
  }
}
const handleSlashCommand = async (
  client: Client,
  interaction: CommandInteraction
): Promise<void> => {
  const slashCommand = slashCommands.find(
    (c) => c.name === interaction.commandName
  );
  if (!slashCommand) {
    interaction.reply({ content: "An error has occurred" });
    return;
  }

  slashCommand.run(client, interaction);
};

client.on(Events.InteractionCreate, async (interaction) => {
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
  } else if (
    interaction.isCommand() &&
    interaction.isMessageContextMenuCommand() === false
  ) {
    await handleSlashCommand(client, interaction);
  }
});

client.on(Events.GuildCreate, async (guild) => {
  await prisma.server.create({
    data: {
      id: guild.id,
      destinationPlatform: "spotify",
      enabledAutoConvertorPlatforms: ["appleMusic"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild) return;

    let serverConfig = await prisma.server.findUnique({
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

    // Helper function to handle link conversion
    async function handleLinkConversion(
      content: string,
      platform: string,
      regex: RegExp
    ) {
      const link = content.match(regex);
      if (!link) return;

      try {
        const destinationPlatform =
          serverConfig?.destinationPlatform ?? "spotify";
        const convertedLink = await convert_link(link[0], destinationPlatform);

        if (!convertedLink) {
          console.log(
            `No ${destinationPlatform} link found for ${platform} link`
          );
          return;
        }

        await message.reply({
          content: convertedLink,
          flags: [4096],
          allowedMentions: {
            parse: [],
            repliedUser: false,
          },
        });
      } catch (error) {
        console.error(`Error converting ${platform} link:`, error);
      }
    }

    // Handle Apple Music links
    if (
      serverConfig.enabledAutoConvertorPlatforms.includes("appleMusic") &&
      message.content.includes("https://music.apple.com")
    ) {
      await handleLinkConversion(
        message.content,
        "Apple Music",
        /https?:\/\/(?:itunes\.apple\.com\/|music\.apple\.com\/)(?:[^\/]+\/)?(?:album|artist|song|album\/[^\/]+\/\w+)(?:\/[^\/]+)?\/\d+(?:\?[^\/\s]*)?/
      );
    }

    // Handle Tidal links
    if (
      serverConfig.enabledAutoConvertorPlatforms.includes("tidal") &&
      (message.content.includes("https://listen.tidal.com") ||
        message.content.includes("https://tidal.com"))
    ) {
      await handleLinkConversion(
        message.content,
        "Tidal",
        /https:\/\/(?:listen\.tidal\.com|tidal\.com\/browse)\/(?:album|track)\/(\d+)(?:\/track\/(\d+))?/
      );
    }

    // Handle Spotify links
    if (
      serverConfig.enabledAutoConvertorPlatforms.includes("spotify") &&
      message.content.includes("https://open.spotify.com")
    ) {
      await handleLinkConversion(
        message.content,
        "Spotify",
        /https?:\/\/open\.spotify\.com\/(track|album)\/\w+/
      );
    }

    // Handle SoundCloud links
    if (
      serverConfig.enabledAutoConvertorPlatforms.includes("soundcloud") &&
      message.content.includes("https://soundcloud.com")
    ) {
      await handleLinkConversion(
        message.content,
        "SoundCloud",
        /https?:\/\/soundcloud\.com\/[^\/]+\/[^\/]+/
      );
    }

    // Handle YouTube links
    if (
      serverConfig.enabledAutoConvertorPlatforms.includes("youtube") &&
      message.content.includes("https://youtube.com")
    ) {
      await handleLinkConversion(
        message.content,
        "YouTube",
        /https?:\/\/www\.youtube\.com\/watch\?v=[^&]+/
      );
    }
  } catch (error) {
    console.error("Error in MessageCreate event:", error);
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
