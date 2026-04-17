import type { Meta, StoryObj } from "@storybook/react";
import { SkillBar } from "./SkillBar";

const meta: Meta<typeof SkillBar> = {
  title: "Components/SkillBar",
  component: SkillBar,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SkillBar>;

export const Low: Story = {
  args: { label: "Defending", level: 3 },
};

export const Medium: Story = {
  args: { label: "Playmaking", level: 8 },
};

export const High: Story = {
  args: { label: "Scoring", level: 14 },
};

export const WithIncrease: Story = {
  args: {
    label: "Keeper",
    level: 12,
    change: {
      id: 1,
      playerId: 1,
      detectedAt: "2026-04-04T12:00:00Z",
      key: "keeperSkill",
      oldValue: "11",
      newValue: "12",
    },
  },
};

export const WithDecrease: Story = {
  args: {
    label: "Stamina",
    level: 7,
    change: {
      id: 2,
      playerId: 1,
      detectedAt: "2026-04-04T12:00:00Z",
      key: "staminaSkill",
      oldValue: "8",
      newValue: "7",
    },
  },
};
