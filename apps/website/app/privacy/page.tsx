import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Korb Guru.",
};

export default function PrivacyPage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Privacy Policy
      </h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground">
        <p className="text-muted-foreground">
          <strong>Last updated:</strong> [Replace with date, e.g. 2025-01-15.]
          Host this page at <strong>https://korb.guru/privacy</strong> and set
          that URL in App Store Connect and Google Play Console.
        </p>
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            1. Information we collect
          </h2>
          <p className="text-muted-foreground">
            Template: Describe what data you collect (e.g. account info, usage
            data, device identifiers) and for what purpose.
          </p>
        </section>
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            2. How we use your information
          </h2>
          <p className="text-muted-foreground">
            Template: Explain use cases (service delivery, analytics,
            communication, compliance).
          </p>
        </section>
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            3. Data sharing and third parties
          </h2>
          <p className="text-muted-foreground">
            Template: List categories of third parties (e.g. hosting, analytics,
            auth) and whether you sell data.
          </p>
        </section>
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            4. Your rights and contact
          </h2>
          <p className="text-muted-foreground">
            Template: Describe user rights (access, deletion, portability) and
            how to contact you (email or address). For EU/EEA include legal
            basis and right to complain to a supervisory authority.
          </p>
        </section>
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            5. Account deletion
          </h2>
          <p className="text-muted-foreground">
            You can delete your account and associated data at any time from
            within the app (Account → Delete my account). This permanently
            removes your profile and data from our systems. Replace this
            paragraph with your actual deletion process and retention details.
          </p>
        </section>
      </div>
    </main>
  );
}
