import type { Meta, StoryObj } from "@storybook/react";
import { SquadTsiChart } from "./SquadTsiChart";

const history = [
  { at: "2026-04-10T00:27:37Z", tsi: 194150, playerCount: 29 },
  { at: "2026-04-17T00:53:35Z", tsi: 247850, playerCount: 29 },
  { at: "2026-05-19T01:15:07Z", tsi: 272560, playerCount: 31 },
  { at: "2026-07-16T22:43:27Z", tsi: 344090, playerCount: 25 },
  { at: "2026-10-02T20:20:57Z", tsi: 461110, playerCount: 27 },
];

const meta: Meta<typeof SquadTsiChart> = {
  title: "Components/SquadTsiChart",
  component: SquadTsiChart,
  parameters: { layout: "padded" },
  args: { history },
};
export default meta;
type Story = StoryObj<typeof SquadTsiChart>;

export const FullHistory: Story = {};
export const SingleRecord: Story = { args: { history: history.slice(0, 1) } };
export const Empty: Story = { args: { history: [] } };
export const Loading: Story = { args: { history: [], loading: true } };
export const Error: Story = { args: { history: [], error: "Unavailable" } };
export const Decline: Story = {
  args: {
    history: [
      { at: "2026-10-01T12:00:00Z", tsi: 200000, playerCount: 27 },
      { at: "2026-10-02T12:00:00Z", tsi: 180000, playerCount: 26 },
    ],
  },
};
