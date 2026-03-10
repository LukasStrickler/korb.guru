import Link from "next/link";

const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors";
const btnSecondary =
  "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors";
const btnOutline =
  "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted transition-colors";

export default function Home() {
  return (
    <main className="container max-w-4xl mx-auto px-4 py-12 md:py-20">
      <section className="flex flex-col items-center text-center gap-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground">
          Meal planning & shared shopping for households
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Placeholder: Describe your product value proposition here. Funnel
          visitors to download the app from the App Store or Google Play, or to
          open shared links directly in the app when they have it installed.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href="#app-store"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download on the App Store"
            className={btnPrimary}
          >
            App Store
          </a>
          <a
            href="#play-store"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get it on Google Play"
            className={btnSecondary}
          >
            Google Play
          </a>
        </div>
      </section>

      <section className="mt-24 border-t border-border pt-16">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Shared links
        </h2>
        <p className="text-muted-foreground max-w-xl">
          When someone shares a link like{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            https://korb.guru/go/...
          </code>
          , opening it on a phone will offer to open in the Korb Guru app if
          installed, or show options to download. Replace the store links above
          with your real App Store and Play Store URLs when you publish.
        </p>
        <Link href="/go/example" className={`${btnOutline} mt-4 inline-block`}>
          Try example link
        </Link>
      </section>
    </main>
  );
}
