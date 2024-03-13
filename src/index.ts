// Require the necessary discord.js classes
import { Client, Events, GatewayIntentBits } from "discord.js";

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

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content.includes("https://music.apple.com")) {
    // find the first instance of the link
    // the link can be in the middle of the message, so edit the regex to only have include the link without the rest of the message
    // const link = message.content.match(/https:\/\/music.apple.com\/.*/);

    const link = message.content.match(
      /https?:\/\/(?:itunes\.apple\.com\/|music\.apple\.com\/)(?:[^\/]+\/)?(?:album|artist|song|album\/[^\/]+\/\w+)(?:\/[^\/]+)?\/\d+(?:\?[^\/\s]*)?/
    );

    if (link) {
      const apiRequest = await fetch(
        `https://api.song.link/v1-alpha.1/links?url=${link}&userCountry=US&songIfSingle=true`
      );
      const data = (await apiRequest.json()) as any;
      if (data.linksByPlatform === undefined) {
        return;
      }
      await message.reply({
        content: `${data.linksByPlatform.spotify.url}`,
        flags: [4096],
        options: {
          allowedMentions: {
            parse: [],
            repliedUser: false,
          },
        },
      });
    }
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
