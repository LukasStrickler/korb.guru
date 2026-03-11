import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  initialGlobals: {
    viewport: { value: "mobile2", isRotated: false },
  },
};

export default preview;
