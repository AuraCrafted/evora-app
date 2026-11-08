# Apple Review Fixes (5.1.1(i) / 5.1.2(i))

- [x] 1. Fix missing `isEvolve`/`pickEntitlement` imports in coach-chat + journey-coach
- [x] 2. Server-side AI consent enforcement (user_state `ai_consent`, fail closed) in coach-chat, journey-coach, generate-task
- [x] 3. Consent UI: AiConsentDialog (Agree & Continue / Not Now), Settings withdrawal, removed PrivacyConsent dead end
- [x] 4. Privacy Policy AI disclosures (providers, data categories, consent/withdrawal)
- [x] 5. Tests (30 pass) + typecheck clean + functions deployed + live 401/403/200 verified

Manual steps remaining for the user: App Store Connect App Privacy answers, resubmit build.

## Apple refund policy and support links
- [x] Replace refund guarantee and cancellation wording with Apple's process across policy pages.
- [x] Link directly to Feedback from refund, terms, and privacy pages.
- [ ] Verify policy pages and Feedback navigation in the preview.
