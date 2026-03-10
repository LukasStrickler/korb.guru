import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum (legal notice) for Korb Guru.",
};

export default function ImpressumPage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-6">Impressum</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground">
        <p className="text-muted-foreground">
          Replace this with your legal notice (Impressum). Required in Germany
          and some other jurisdictions for commercial or professional websites.
        </p>
        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Angaben gemäß § 5 TMG (template)
          </h2>
          <p className="text-muted-foreground">
            [Company / Name]
            <br />
            [Street]
            <br />
            [Postal code and city]
          </p>
        </section>
        <section className="mt-8 space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Kontakt</h2>
          <p className="text-muted-foreground">E-Mail: [your contact email]</p>
        </section>
      </div>
    </main>
  );
}
