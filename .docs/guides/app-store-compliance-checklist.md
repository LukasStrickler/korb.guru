# App Store Compliance Checklist — Korb Guru

Domain: **korb.guru**. This doc is the **store requirements reference** (costs, Apple/Google requirements, repo config, external links). For the **pre-launch checklist** (concrete steps for this repo), see [Deploy and rollback](../runbooks/deploy-and-rollback.md#before-production).

- [Direct costs](#direct-costs)
- [Apple App Store requirements](#apple-app-store-requirements)
- [Google Play requirements](#google-play-requirements)
- [Reference](#reference)

---

## Direct costs

| Item                                 | Cost                                 | Notes                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apple Developer Program**          | **$99 USD / year**                   | Required to submit to the App Store. Auto-renews. [Fee waiver](https://developer.apple.com/support/fee-waiver) for eligible nonprofits, education, government.              |
| **Google Play Developer account**    | **$25 USD one-time**                 | Required to publish on Play. No annual fee.                                                                                                                                 |
| **Expo EAS Build**                   | **Free tier** (limited builds/month) | Free plan has a monthly quota of low-priority builds; resets each month. Paid plans (e.g. ~$19/month) if you need more. [EAS billing](https://docs.expo.dev/billing/plans). |
| **Domain (korb.guru)**               | **~$10–15 / year**                   | Depends on registrar. Needed for privacy policy URL and deep links.                                                                                                         |
| **Vercel (website)**                 | **Free tier**                        | Hobby tier is free; sufficient for landing + privacy page.                                                                                                                  |
| **Clerk / Convex / FastAPI hosting** | **Free tiers**                       | Each has free tiers; costs only if you exceed limits.                                                                                                                       |

**Minimum to publish on both stores:** Apple $99/year + Google $25 one-time (+ domain if not already owned). EAS, Vercel, and backend services can stay on free tiers for launch.

---

## Apple App Store requirements

**Source:** [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Submitting](https://developers.apple.com/app-store/submitting). Apple reviews across **Safety**, **Performance**, **Business**, **Design**, and **Legal**. You are responsible for everything in your app (including third-party SDKs and ad networks).

### Identity and app config

| Requirement                          | Rule / note                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Apple Developer account**          | Required to create apps and submit. Enroll at developer.apple.com.                                                    |
| **Bundle ID**                        | Unique; reverse-domain (e.g. `com.company.app`). Must match the app in App Store Connect. Changing later is breaking. |
| **Privacy policy URL**               | Required. Must be public; set in App Store Connect → App Information → Privacy Policy URL.                            |
| **App created in App Store Connect** | Create app with same bundle ID as in your project. Note the numeric **Apple ID** (ascAppId) for EAS Submit.           |

### Safety

| Requirement                | Rule / note                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| **User-generated content** | If app has UGC: content moderation, Report/Block, age-appropriate enforcement, abuse prevention. |
| **Data security**          | Protect user data; follow best practices.                                                        |
| **No harmful content**     | No child endangerment, illegal activity, harassment, etc.                                        |

### Performance

| Requirement                 | Rule / note                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| **Complete and functional** | App must be complete. No placeholder or lorem-only content for review. |
| **Accurate metadata**       | Name, description, screenshots must match the actual app experience.   |
| **Backend live**            | All services and links must work during review.                        |
| **No crashes / major bugs** | App must run reliably.                                                 |

### Business

| Requirement               | Rule / note                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **In-app purchase (IAP)** | Digital goods/services used in the app must use IAP (with exceptions, e.g. reader apps, enterprise).        |
| **Subscriptions**         | Clear pricing; “Restore Purchases” where applicable.                                                        |
| **Pricing transparency**  | Prices and terms must be clear.                                                                             |
| **External purchase**     | If linking out to purchase (e.g. web), must follow Apple’s rules (e.g. no in-app steering in many regions). |

### Design

| Requirement                            | Rule / note                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Native experience**                  | Provide a native iOS experience; not a web wrapper without added value.                                        |
| **No copycat / minimum functionality** | App must offer sufficient functionality and not mimic other apps deceptively.                                  |
| **Sign in with Apple**                 | If you offer third-party sign-in (Google, etc.), you must also offer Sign in with Apple for the same use case. |

### Legal

| Requirement                   | Rule / note                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **In-app account deletion**   | If the app allows account creation, it must offer **in-app** account deletion (Guideline 5.1.1(v)). Not only sign-out or “contact us to delete.” |
| **Privacy disclosure**        | Privacy policy must disclose data collection and use.                                                                                            |
| **Regional age restrictions** | Comply with age rules per region.                                                                                                                |
| **AI and algorithms**         | If the app uses AI or algorithmic content, transparency and disclosure may be required.                                                          |

### Store listing and submission

| Requirement                         | Rule / note                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **App name, subtitle, description** | Name, subtitle (30 chars), description, keywords, support URL, marketing URL. Must accurately represent the app.                                                                                                                                                                                                                                             |
| **Screenshots**                     | At least one per required device size. No device frames; app content only. iPhone 6.9″: 1260×2736, 1290×2796, or 1320×2868 (portrait); landscape swap dimensions; 1–10 images; JPEG/PNG; max 10MB. Apple scales if you provide one set. [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications). |
| **Age rating**                      | Complete age rating questionnaire. Result: 4+, 9+, 13+, 16+, or 18+. [Age ratings](https://developer.apple.com/help/app-store-connect/reference/age-ratings).                                                                                                                                                                                                |
| **Export compliance**               | Declare encryption use. Standard HTTPS often exempt; upload docs if required. [Export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance).                                                                                                                                                  |
| **Demo account**                    | If app requires login, provide test credentials in Review notes.                                                                                                                                                                                                                                                                                             |
| **Build and submit**                | Upload build (e.g. via EAS Submit or Xcode); process in App Store Connect; select build for version; submit for App Review. TestFlight available for beta.                                                                                                                                                                                                   |

---

## Google Play requirements

**Source:** [Play Console Help](https://support.google.com/googleplay/android-developer), [Play policies](https://play.google.com/about/developer-content-policy/). You must comply with all applicable policies and declare app content and data use accurately.

### Account and app identity

| Requirement                       | Rule / note                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| **Google Play Developer account** | Required; one-time registration fee. Accept agreements.                               |
| **Package name**                  | Unique; must match the app in Play Console (e.g. same as `applicationId` in project). |
| **Play App Signing**              | Required. Google holds the app signing key.                                           |
| **Privacy policy**                | Required. Set in Play Console → Policy status → App content → Privacy policy.         |

### Store listing and content

| Requirement                     | Rule / note                                                                                                                                                                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store listing**               | Title (30 chars), short description (80), full description (4000); feature graphic (1024×500); screenshots (min 2). [Store listing](https://support.google.com/googleplay/android-developer/answer/9859152).                                                                  |
| **Data safety form**            | Declare what data is collected and shared; purpose; whether data is shared with third parties; security practices (e.g. encryption). Must match actual app behavior (including SDKs). [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469). |
| **Target audience and content** | Set target age group; complete content questionnaire (ads, in-app purchases, etc.). [Target audience](https://support.google.com/googleplay/android-developer/answer/9867159).                                                                                                |
| **Content rating (IARC)**       | Complete content rating questionnaire. Required for new apps and updates that change content. [Content ratings](https://support.google.com/googleplay/android-developer/answer/9898843).                                                                                      |
| **App access**                  | If app requires login, provide demo credentials or instructions in App content → App access.                                                                                                                                                                                  |

### Policies (summary)

| Area                         | Rule / note                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User data**                | Transparent handling; limit collection to what’s needed; don’t sell sensitive data without consent; prominent disclosure when data use exceeds expectations. |
| **Permissions**              | Request only needed permissions; comply with photo/video and other sensitive permission policies.                                                            |
| **Restricted content**       | No child endangerment, illegal activity, dangerous content, etc. UGC apps need moderation.                                                                   |
| **Monetization**             | Payments and subscriptions must follow Play policies.                                                                                                        |
| **Target API level**         | New apps and updates must target recent API level (see [Play Console](https://support.google.com/googleplay/android-developer/answer/11926878)).             |
| **SDK and third-party code** | You are responsible for compliance of all code in your app.                                                                                                  |

### Release

| Requirement             | Rule / note                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **First upload**        | First release may require manual AAB upload; then automated (e.g. EAS Submit) can be used. |
| **Testing tracks**      | Internal → closed/open testing → production. Use internal testing for quick iteration.     |
| **Release and rollout** | Create release; set rollout percentage; review and publish.                                |

---

## Reference

### Repo config (this project)

| Item                     | Location                                              |
| ------------------------ | ----------------------------------------------------- |
| Bundle ID (iOS)          | `apps/mobile/app.json` → `expo.ios.bundleIdentifier`  |
| Package (Android)        | `apps/mobile/app.json` → `expo.android.package`       |
| Scheme                   | `apps/mobile/app.json` → `expo.scheme`                |
| Associated domains (iOS) | `apps/mobile/app.json` → `expo.ios.associatedDomains` |
| Intent filters (Android) | `apps/mobile/app.json` → `expo.android.intentFilters` |
| EAS build                | `apps/mobile/eas.json` → `build`                      |
| EAS submit               | `apps/mobile/eas.json` → `submit`                     |

### Optional (when you add the feature)

- **iOS purpose strings:** Add `expo.ios.infoPlist` usage descriptions for camera, photo library, microphone. [Expo – Privacy manifests](https://docs.expo.dev/guides/apple-privacy).
- **Android permissions:** Use `expo.android.permissions` / `expo.android.blockedPermissions`; keep Data safety form aligned.
- **OTA updates:** Add `expo.updates` if using EAS Update.
- **Restore purchases:** Required if you add in-app purchases/subscriptions.
- **Localization:** Store listings and in-app strings per language.

### External links

- **Apple:** [Submitting](https://developers.apple.com/app-store/submitting) · [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) · [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
- **Google:** [Publish your app](https://support.google.com/googleplay/android-developer/answer/9859751) · [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) · [Prepare for review](https://support.google.com/googleplay/android-developer/answer/9859455)
- **Expo:** [EAS Submit](https://docs.expo.dev/submit/introduction/) · [eas.json](https://docs.expo.dev/submit/eas-json/)
- **Docs:** [Local development](local-dev.md) · [Production overview](../architecture/production-overview.md) · [apps/website README](../../apps/website/README.md)

---
