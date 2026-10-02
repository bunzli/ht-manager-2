import type { Meta, StoryObj } from "@storybook/react";
import { PlayerCard } from "./PlayerCard";
import { mockPlayers } from "./mockData";

const meta: Meta<typeof PlayerCard> = {
  title: "Components/PlayerCard",
  component: PlayerCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
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

export const NarrowWithLongName: Story = {
  args: {
    player: {
      ...mockPlayers[0],
      firstName: "Alexandros",
      nickName: "The captain",
      lastName: "Papadopoulos Fernández",
      keeperSkill: 0,
      playmakerSkill: 20,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 294 }}>
        <Story />
      </div>
    ),
  ],
};
export const Selected: Story = { args: { player: mockPlayers[0], selected: true } };
export const BrokenAvatar: Story = {
  args: {
    player: { ...mockPlayers[0], avatarBackground: "/missing-avatar.png", avatarLayers: "[]" },
  },
};
