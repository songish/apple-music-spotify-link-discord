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
  const apiRequest = await fetch(
    `https://api.song.link/v1-alpha.1/links?url=${link}&userCountry=US&songIfSingle=true`
  );
  const data = (await apiRequest.json()) as any;
  if (data.linksByPlatform === undefined) {
    return null;
  }
  const platformLink = data.linksByPlatform[platform];
  if (platformLink === undefined) {
    return null;
  }
  return platformLink.url;
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
  const link = interaction.targetMessage.content.match(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
  );
  if (!link) {
    await interaction.reply({
      content: "Sorry, I couldn't convert that link.",
      allowedMentions: {
        parse: [],
        repliedUser: false,
      },
      ephemeral: true,
    });
    return;
  }
  const convertedLink = await convert_link(link[0], platform);
  if (convertedLink === null) {
    await interaction.reply({
      content: "Sorry, I couldn't convert that link.",
      allowedMentions: {
        parse: [],
        repliedUser: false,
      },
      ephemeral: true,
    });
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

  if (
    serverConfig.enabledAutoConvertorPlatforms.includes("appleMusic") &&
    message.content.includes("https://music.apple.com")
  ) {
    const link = message.content.match(
      /https?:\/\/(?:itunes\.apple\.com\/|music\.apple\.com\/)(?:[^\/]+\/)?(?:album|artist|song|album\/[^\/]+\/\w+)(?:\/[^\/]+)?\/\d+(?:\?[^\/\s]*)?/
    );
    if (!link) return;
    const convertedLink = await convert_link(
      link.toString(),
      serverConfig.destinationPlatform ?? "spotify"
    );
    if (convertedLink === null) {
      await message.reply({
        content: "Sorry, I couldn't convert that link.",
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
        options: {
          ephemeral: true,
        },
      });
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

  if (
    serverConfig.enabledAutoConvertorPlatforms.includes("tidal") &&
    (message.content.includes("https://listen.tidal.com") ||
      message.content.includes("https://tidal.com"))
  ) {
    const link = message.content.match(
      /https:\/\/(?:listen\.tidal\.com|tidal\.com\/browse)\/(?:album|track)\/(\d+)(?:\/track\/(\d+))?/
    );
    if (!link) return;
    const convertedLink = await convert_link(
      link[0],
      serverConfig.destinationPlatform ?? "spotify"
    );
    if (convertedLink === null) {
      await message.reply({
        content: "Sorry, I couldn't convert that link.",
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
        options: {
          ephemeral: true,
        },
      });
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

  if (
    serverConfig.enabledAutoConvertorPlatforms.includes("spotify") &&
    message.content.includes("https://open.spotify.com")
  ) {
    const link = message.content.match(
      /https?:\/\/open\.spotify\.com\/(track|album)\/\w+/
    );
    if (!link) return;
    const convertedLink = await convert_link(
      link[0],
      serverConfig.destinationPlatform ?? "spotify"
    );
    if (convertedLink === null) {
      await message.reply({
        content: "Sorry, I couldn't convert that link.",
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
        options: {
          ephemeral: true,
        },
      });
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

  if (
    serverConfig.enabledAutoConvertorPlatforms.includes("soundcloud") &&
    message.content.includes("https://soundcloud.com")
  ) {
    const link = message.content.match(
      /https?:\/\/soundcloud\.com\/[^\/]+\/[^\/]+/
    );
    if (!link) return;
    const convertedLink = await convert_link(
      link[0],
      serverConfig.destinationPlatform ?? "spotify"
    );
    if (convertedLink === null) {
      await message.reply({
        content: "Sorry, I couldn't convert that link.",
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
        options: {
          ephemeral: true,
        },
      });
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

  if (
    serverConfig.enabledAutoConvertorPlatforms.includes("youtube") &&
    message.content.includes("https://youtube.com")
  ) {
    const link = message.content.match(
      /https?:\/\/www\.youtube\.com\/watch\?v=[^&]+/
    );
    if (!link) return;
    const convertedLink = await convert_link(
      link[0],
      serverConfig.destinationPlatform ?? "spotify"
    );
    if (convertedLink === null) {
      await message.reply({
        content: "Sorry, I couldn't convert that link.",
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
        options: {
          ephemeral: true,
        },
      });
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
