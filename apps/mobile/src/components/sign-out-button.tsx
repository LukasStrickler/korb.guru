import { resetUser } from "@/lib/posthog";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, Text } from "react-native";

export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      resetUser();
      await signOut();
      router.replace("/(auth)/sign-in" as Href);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <Pressable
      onPress={handleSignOut}
      className="bg-gray-200 py-3 px-6 rounded-xl items-center mt-2 active:opacity-80"
    >
      <Text className="text-gray-700 text-base font-semibold">Sign out</Text>
    </Pressable>
  );
}
