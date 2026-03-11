import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

/**
 * Hidden deep-link handler: korbguru://go/... and https://korb.guru/go/...
 * Not shown in app UI; resolves the slug and replaces to the target route immediately.
 * Extend resolveSlugToHref() to open specific screens (e.g. /go/recipe/123 → recipe screen).
 */
function resolveSlugToHref(slug: string[]): Href {
  if (slug.length === 0) return "/(home)";
  const [type, _id] = slug;
  switch (type) {
    // Add cases as you add screens, e.g.:
    // case "recipe": return `/(home)/recipe/${_id ?? ""}` as Href;
    // case "list": return `/(home)/list/${_id ?? ""}` as Href;
    default:
      return "/(home)";
  }
}

export default function GoDeepLinkScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string[] }>();
  const router = useRouter();
  const segments = Array.isArray(slug) ? slug : slug != null ? [slug] : [];
  const slugKey = segments.join("/");

  useEffect(() => {
    const parts = slugKey ? slugKey.split("/") : [];
    const href = resolveSlugToHref(parts);
    router.replace(href);
  }, [router, slugKey]);

  return <View className="flex-1 bg-white" />;
}
