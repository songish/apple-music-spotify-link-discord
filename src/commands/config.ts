import { EmbedBuilder } from "discord.js";
import { prisma } from "../index";
import { Command } from "../utils/command";

export const configCommand: Command = {
  name: "config",
  description: "See your current config.",
  defaultMemberPermissions: "ManageGuild",

  run: async (client, interaction) => {
    if (!interaction.guild) return;

    const server = await prisma.server.findFirst({
      where: { id: interaction.guild.id },
    });

    if (!server) {
      await prisma.server.create({
        data: {
          id: interaction.guild.id,
          destinationPlatform: "spotify",
          enabledAutoConvertorPlatforms: ["appleMusic"],
        },
      });

      return interaction.reply({
        content:
          "the server didn't exist in our database yet, just insertted your server!",
        ephemeral: true,
      });
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder().setDescription(
          `destination platform: **${server.destinationPlatform}**\n` +
            `enabled auto-convert platforms: **${server.enabledAutoConvertorPlatforms.join(
              ", "
            )}**\n` +
            `\n` +
            "**raw data**\n" +
            `\`\`\`json\n${JSON.stringify(server, null, 2)}\`\`\``
        ),
      ],
      ephemeral: true,
    });
  },
};
