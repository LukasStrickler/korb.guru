import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-4xl mx-auto items-center justify-between px-4">
        <Link href="/" className="font-semibold text-foreground">
          Korb Guru
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/impressum"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Impressum
          </Link>
        </nav>
      </div>
    </header>
  );
}
