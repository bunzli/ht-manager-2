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
  args: {
    player: {
      ...mockPlayers[1],
      countryId: 3,
      countryName: "Germany",
      countryFlagId: 3,
      trainingBaselineAt: "2026-04-01T12:00:00Z",
      tsiVariationTraining: 1200,
      trainingChanges: {
        keeperSkill: { oldValue: "11", newValue: "12" },
        playerForm: { oldValue: "4", newValue: "6" },
        staminaSkill: { oldValue: "7", newValue: "6" },
      },
    },
  },
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

export const WithAvatarAndNationality: Story = {
  args: {
    player: {
      ...mockPlayers[0],
      countryId: 17,
      countryName: "Chile",
      countryFlagId: 18,
      avatarBackground: "/Img/Avatar/backgrounds/card1.png",
      avatarLayers: JSON.stringify([
        { x: 9, y: 10, image: "/Img/Avatar/backgrounds/bg_blue_int.png" },
        { x: 9, y: 10, image: "/Img/Avatar/bodies/bd2_s1.png" },
        { x: 9, y: 10, image: "/Img/Avatar/faces/f9a.png" },
        { x: 25, y: 15, image: "/Img/Avatar/eyes/e36b.png" },
        { x: 32, y: 64, image: "/Img/Avatar/mouths/m34b.png" },
        { x: 15, y: 20, image: "/Img/Avatar/noses/n35.png" },
        { x: 9, y: 10, image: "/Img/Avatar/hair/f9h2d.png" },
      ]),
      trainingBaselineAt: "2026-04-01T12:00:00Z",
      tsiVariationTraining: -500,
      trainingChanges: {
        playerForm: { oldValue: "8", newValue: "7" },
        playmakerSkill: { oldValue: "8", newValue: "9" },
        passingSkill: { oldValue: "10", newValue: "8" },
      },
    },
  },
};
