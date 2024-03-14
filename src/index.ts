// Require the necessary discord.js classes
import {
  ApplicationCommandType,
  CacheType,
  Client,
  ContextMenuCommandBuilder,
  Events,
  GatewayIntentBits,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import dotenv from "dotenv";
dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

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

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async (readyClient) => {
  await readyClient.application.commands.set([
    contextAppleMusic,
    contextSpotify,
    contextYoutube,
    contextSoundcloud,
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isMessageContextMenuCommand()) return;
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
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content.includes("https://music.apple.com")) {
    const link = message.content.match(
      /https?:\/\/(?:itunes\.apple\.com\/|music\.apple\.com\/)(?:[^\/]+\/)?(?:album|artist|song|album\/[^\/]+\/\w+)(?:\/[^\/]+)?\/\d+(?:\?[^\/\s]*)?/
    );
    if (!link) return;
    const convertedLink = await convert_link(link.toString(), "spotify");
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
