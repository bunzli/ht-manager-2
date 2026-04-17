import type { Meta, StoryObj } from "@storybook/react";
import { PlayerCard } from "./PlayerCard";
import { mockPlayers } from "./mockData";

const meta: Meta<typeof PlayerCard> = {
  title: "Components/PlayerCard",
  component: PlayerCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof PlayerCard>;

export const Default: Story = {
  args: { player: mockPlayers[0] },
};

export const WithSkillChange: Story = {
  args: { player: mockPlayers[1] },
};

export const InjuredWithCards: Story = {
  args: { player: mockPlayers[2] },
};

export const LongTermInjury: Story = {
  args: { player: mockPlayers[3] },
};

export const TransferListed: Story = {
  args: { player: mockPlayers[4] },
};
