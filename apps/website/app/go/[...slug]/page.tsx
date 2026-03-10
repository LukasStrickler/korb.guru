"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { APP_SCHEME } from "@/lib/app-linking";
import { cn } from "@/lib/utils";

const APP_STORE_URL = "#app-store";
const PLAY_STORE_URL = "#play-store";

function getSlugPath(slug: string[]): string {
  return "/" + slug.join("/");
}

export default function GoPage() {
  const params = useParams();
  const slug = (params.slug as string[]) ?? [];
  const path = getSlugPath(slug);
  const appDeepLink = `${APP_SCHEME}://go${path}`;
  const appStoreLink = APP_STORE_URL;
  const playStoreLink = PLAY_STORE_URL;

  const tryOpenApp = useCallback(() => {
    window.location.href = appDeepLink;
  }, [appDeepLink]);

  return (
    <main className="container max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Open in Korb Guru
      </h1>
      <p className="text-muted-foreground mb-8">
        This link can be opened in the Korb Guru app. If the app did not open,
        use the button below or download the app.
      </p>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={tryOpenApp}>
          Open in app
        </Button>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href={appStoreLink}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            App Store
          </a>
          <a
            href={playStoreLink}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Google Play
          </a>
        </div>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4">
          Back to home
        </Link>
      </p>
    </main>
  );
}
