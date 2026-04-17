import type { Meta, StoryObj } from "@storybook/react";
import { PlayerList } from "./PlayerList";
import { mockPlayers } from "./mockData";

const meta: Meta<typeof PlayerList> = {
  title: "Components/PlayerList",
  component: PlayerList,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PlayerList>;

export const FullSquad: Story = {
  args: { players: mockPlayers },
};

export const Empty: Story = {
  args: { players: [] },
};

export const SinglePlayer: Story = {
  args: { players: [mockPlayers[0]] },
};
