import type { PressableProps } from "react-native";
import { Pressable } from "react-native";

type AccessiblePressableProps = PressableProps & {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: PressableProps["accessibilityRole"];
};

export function AccessiblePressable({
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  ...props
}: AccessiblePressableProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      {...props}
    />
  );
}
