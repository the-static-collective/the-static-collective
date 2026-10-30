# HUMAN-PORCH-002 · From a dummy door to a useful first action

The existing [webZ porch](https://webz.abundent.org/porch/) is a deliberately undeliverable rehearsal for sovereign world decisions. It has `NOT_ISSUED` and `delivery_enabled=false`; that is accurate and remains unchanged. The user-facing front door should NOT send people there as though it can receive help requests.

## Why this new porch

Before: "I could use a hand" on the front door opened a project directory or lab and asked a visitor to learn vocabulary, with no real next action.

After: `/porch/` asks whether a human needs help, has something to offer, or has a question; lets them express one small particular; and gives them a portable note plus a deliberate human-controlled handoff: copy, save, or email Abundent via `mailto:us@abundent.org`. No account, localStorage, third-party JS, analytics, background network request, public posting, partner impersonation, automatic assignment, or invented matching.

**At no point does this app claim delivery.** Email relies on an installed mail client and sending is outside the page; recipients can still decline or be unavailable. A dedicated public intake backend would require its own privacy, moderation, retention and abuse review, not just a disabled button made clickable.

## UX goals

1. A stranger understands what to do within a short reading window.
2. The first action produces something useful even without a backend or responder.
3. Their own note belongs to them and can be used elsewhere.
4. Statuses **DRAFT / READY / NOT SENT / EMAIL APP OPENED** remain separate.
5. Don't request legal names, phone numbers, exact addresses, medical details, children's details or another person's private story.
6. Human-first content is separate from technical crossing proofs.

## Validation

Run `node --test front-door/porch/engine.test.mjs` from the repository root. CI runs this with Python structural tests.

## Promotion boundaries

This remains part of `front-door/` in the original draft PR and on `hello.abundent.org`. The existing `abundent.org`, `webz.abundent.org/porch/` and existing technical proof gates remain unchanged. Test mobile browser, email app behavior, copy/download, keyboard access, and real response workflows before promoting apex or promising an actual community-matching service.

## Future crossing

If a true moderated inbox becomes appropriate: independent backend project, informed consent, abuse mitigation, controls for sensitive cases, human moderation, retention/deletion policy, clear expectations and verified reply path. No silent autopublishing and no false promises.


## Private voluntary review loop (PORCH-RECEIVER-009)

An additional opt-in **Send privately for review** button now sends bounded public-safe notes to a separate Supabase Edge Function (`porch-receiver-009`) with explicit consent. The service returns a receipt ID and a one-time private key. A visitor may copy/save it, then later check the real stored status or withdraw and delete. Receiving is real; matching, email notification, publishing, and fulfilling work are NOT implemented. No browser autosave. JAR;VIS's existing login-scoped operator desk can review and prepare a safe status reply, but will not automatically send it. See JAR;VIS `docs/PORCH-RECEIVER-009.md` for provider and retention details. This is separate from the email draft and webZ rehearsal.
