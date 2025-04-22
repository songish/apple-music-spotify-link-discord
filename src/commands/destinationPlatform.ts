import { ApplicationCommandOptionType } from "discord.js";
import { prisma } from "../index";
import { Command } from "../utils/command";

export const setDestinationPlatform: Command = {
  name: "setdestinationplatform",
  description: "Set a different destination platform.",
  defaultMemberPermissions: "ManageGuild",
  options: [
    {
      name: "platform",
      description: "The platform to select",
      type: ApplicationCommandOptionType.String,
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
    if (!interaction.guild) return;

    const newDestinationPlatform = interaction.options.get("platform")
      ?.value as string;
    if (!newDestinationPlatform) return;

    await prisma.server.update({
      where: {
        id: interaction.guild.id,
      },
      data: {
        // @ts-ignore bro idc
        destinationPlatform: newDestinationPlatform,
      },
    });

    return interaction.reply({
      content: `Selected ${
        interaction.options.get("platform")?.value
      } as the destination platform to convert to.`,
      ephemeral: true,
    });
  },
};
