import type { Meta, StoryObj } from "@storybook/react";
import { PlayerAvatar } from "./PlayerAvatar";

const meta: Meta<typeof PlayerAvatar> = {
  title: "Components/PlayerAvatar",
  component: PlayerAvatar,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof PlayerAvatar>;

const exampleLayers = [
  { x: 5, y: 5, image: "/Img/Avatar/bodies/bd8_s1.png" },
  { x: 5, y: 5, image: "/Img/Avatar/faces/f7c.png" },
  { x: 19, y: -1, image: "/Img/Avatar/eyes/e14c.png" },
  { x: 28, y: 36, image: "/Img/Avatar/mouths/m33c.png" },
  { x: 14, y: 6, image: "/Img/Avatar/noses/n38.png" },
  { x: 5, y: 5, image: "/Img/Avatar/hair/f7h7e.png" },
];

export const WithAvatar: Story = {
  args: {
    backgroundImage: "/Img/Avatar/backgrounds/bg_blue_int.png",
    layers: exampleLayers,
  },
};

export const BackgroundOnly: Story = {
  args: {
    backgroundImage: "/Img/Avatar/backgrounds/bg_blue_int.png",
    layers: [],
  },
};

export const NoAvatar: Story = {
  args: {
    backgroundImage: "",
    layers: [],
  },
};
