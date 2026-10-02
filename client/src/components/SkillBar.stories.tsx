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

export const Hattrick: Story = { args: { label: "Playmaking", level: 15, variant: "hattrick" } };
export const HattrickLow: Story = { args: { label: "Set Pieces", level: 1, variant: "hattrick" } };
export const HattrickForm: Story = {
  args: { label: "Form", level: 8, maxLevel: 8, variant: "hattrick" },
};

export const TrainingChanges: Story = {
  render: () => (
    <div className="max-w-sm space-y-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
        <SkillBar key={level} label="Form" level={level} maxLevel={8} variant="hattrick" />
      ))}
      <SkillBar
        label="Form ↑"
        level={7}
        maxLevel={8}
        variant="hattrick"
        change={{ oldValue: "5", newValue: "7" }}
      />
      <SkillBar
        label="Stamina ↓"
        level={4}
        maxLevel={8}
        variant="hattrick"
        change={{ oldValue: "6", newValue: "4" }}
      />
      <SkillBar
        label="Passing ↑"
        level={10}
        variant="hattrick"
        change={{ oldValue: "9", newValue: "10" }}
      />
      <SkillBar
        label="Scoring ↓"
        level={6}
        variant="hattrick"
        change={{ oldValue: "8", newValue: "6" }}
      />
      <SkillBar label="Keeper" level={0} variant="hattrick" />
      <SkillBar label="Playmaking" level={20} variant="hattrick" />
    </div>
  ),
};
