import { useState } from "react";
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
      <SkillBar
        label="Unchanged"
        level={6}
        maxLevel={8}
        variant="hattrick"
        change={{ oldValue: "6", newValue: "6" }}
      />
      <SkillBar label="No baseline" level={6} maxLevel={8} variant="hattrick" />
      <SkillBar
        label="Invalid"
        level={6}
        maxLevel={8}
        variant="hattrick"
        change={{ oldValue: "invalid", newValue: "6" }}
      />
      <SkillBar
        label="Empty"
        level={6}
        maxLevel={8}
        variant="hattrick"
        change={{ oldValue: "", newValue: "6" }}
      />
      <SkillBar
        label="Keeper"
        level={0}
        variant="hattrick"
        change={{ oldValue: "1", newValue: "0" }}
      />
      <SkillBar
        label="Playmaking"
        level={20}
        variant="hattrick"
        change={{ oldValue: "19", newValue: "20" }}
      />
    </div>
  ),
};

function AnimationPreview() {
  const [reversed, setReversed] = useState(false);
  const [renders, setRenders] = useState(0);
  const [level, setLevel] = useState(6);
  const bars = [
    { id: "form", label: "Form", level, maxLevel: 8, previous: 7 },
    { id: "passing", label: "Passing", level: 10, maxLevel: 20, previous: 9 },
  ];
  return (
    <div className="max-w-sm space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <button className="rounded border p-2" onClick={() => setRenders(renders + 1)}>
          Rerender ({renders})
        </button>
        <button className="rounded border p-2" onClick={() => setReversed(!reversed)}>
          Reverse order
        </button>
        <button className="rounded border p-2" onClick={() => setLevel(level === 6 ? 8 : 6)}>
          Change form
        </button>
      </div>
      {(reversed ? [...bars].reverse() : bars).map((bar) => (
        <SkillBar
          key={bar.id}
          label={bar.label}
          level={bar.level}
          maxLevel={bar.maxLevel}
          variant="hattrick"
          change={{ oldValue: String(bar.previous), newValue: String(bar.level) }}
        />
      ))}
      <p className="text-xs text-[#777]">Scroll down to reveal another weekly change.</p>
      <div aria-hidden="true" className="h-screen" />
      <SkillBar
        label="Stamina"
        level={4}
        maxLevel={8}
        variant="hattrick"
        change={{ oldValue: "6", newValue: "4" }}
      />
    </div>
  );
}

export const AnimationPlayback: Story = {
  render: () => <AnimationPreview />,
};

export const ColorChanges: Story = {
  render: () => (
    <div className="max-w-sm space-y-3">
      {[
        { label: "Red → orange", previous: 2, level: 3 },
        { label: "Orange → gold", previous: 4, level: 5 },
        { label: "Gold → green", previous: 6, level: 7 },
        { label: "Orange → red", previous: 3, level: 2 },
        { label: "Gold → orange", previous: 5, level: 4 },
        { label: "Green → gold", previous: 7, level: 6 },
        { label: "Same color", previous: 5, level: 6 },
      ].map(({ label, previous, level }) => (
        <SkillBar
          key={label}
          label={label}
          level={level}
          maxLevel={8}
          variant="hattrick"
          change={{ oldValue: String(previous), newValue: String(level) }}
        />
      ))}
    </div>
  ),
};
