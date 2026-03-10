import type { TextInputProps } from "react-native";
import { TextInput } from "react-native";

type AccessibleTextInputProps = TextInputProps & {
  accessibilityLabel: string;
  accessibilityHint?: string;
};

export function AccessibleTextInput({
  accessibilityLabel,
  accessibilityHint,
  ...props
}: AccessibleTextInputProps) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...props}
    />
  );
}
