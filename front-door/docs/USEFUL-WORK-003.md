# ABUNDENT / USEFUL-WORK-003 — From a beautiful machine to a completed human act

**Status: proposal and bounded staging implementation, not an operating matching network.**

## Human promise

Abundent should make the next useful move easier than scrolling. A visitor can arrive with one need, offer, or question, receive a small plan even if no volunteer appears, send an explicitly consented private note if they wish, see what actually happened to it, and keep a portable result.

The unusual part is not an endless directory of novel software. It is the **honest return loop**: clear scope, human decision, reversibility, result, uncertainty, and a way to carry a useful method into the next encounter.

A visitor never needs to learn JAR;VIS, reLATTE, webZ, planZ, BananaSpork, or the Static Collective graph to use the entrance. Those are source-owned engines behind doors, not claims of a shared deployed service.

## Observed foundations (2026-10-30)

- FRONT-DOOR-002 staging has need / offer / question choices, a note composer, plain links, and a privacy-aware feedback widget.
- HUMAN-PORCH-002 has user-controlled copy, save, and email. PORCH-RECEIVER-009 adds a separate explicit-consent **private** Supabase queue, status receipt, and withdrawal route. Actual intake is not successful matching.
- A JAR;VIS operator path and Waseca's separately moderated reality2 board exist as different authority surfaces. Their existence does not authorize automatic handoff or public display.
- BananaSpork has a real authenticated need -> offer -> report -> confirmation lifecycle on main, but its README explicitly still requires live two-account RLS and physical-device field proof.
- webZ and reLATTE demonstrate local crossings and attribution, but most demos are not public volunteer delivery services.

No claim of real-world completed work follows solely from any of those artifacts.

## Build order: every gate earns the next one

### 0. Make the site useful even with zero helpers (this PR)

For every valid porch note, provide a rule-guided, local-only **next ten minutes** card. It must remain useful without connectivity, an account, an AI provider, or an imaginary matching engine. The visitor can copy it. The UI labels it as a suggested plan, not an assignment or confirmation. The same small flow must support need, offer, and question.

**Acceptance:** works in browser, uses DOM textContent rather than HTML insertion, does not add requests/storage, passes Node unit tests, preserves private-receiver consent and existing staging boundaries.

### 1. Prove the real private return (no public publishing)

Run a controlled two-role pilot: a consenting human submits one non-sensitive note, retains a receipt, an authenticated operator reviews it, the human can check a real response or withdraw, and the note expires under the stated retention window. Test malformed inputs, lost keys, double submit, moderator refusal, provider outage, and attempts at unauthorized access.

**Acceptance:** receipt/status/withdraw semantics work across devices; no operator response impersonates field fulfillment; publicly safe logs contain no visitor note text or keys.

### 2. Give the operator a real instrument panel

Provide a source-owned, permissioned view of PENDING / HOLD / ANSWERED / DECLINED / WITHDRAWN / EXPIRED. JAR;VIS may suggest bounded next questions or a redacted reply, but all outbound messages and publications require explicit operator action. A visitor should see honest status rather than a fake progress bar. Expose backlog and response capacity privately; no surveillance dashboard.

**Acceptance:** deterministic review histories, separate moderator identity and source receipt, explicit refusal, no silent escalation, idempotent retries.

### 3. Add one optional public handoff

Only after private review, ask for **separate, explicit consent** to turn a redacted question into a local public invitation. The Waseca board owns its moderation and decision. No note crosses into Garden, BananaSpork, or partner channels merely because a keyword matched.

**Acceptance:** source and receiver each return explicit decisions; withdrawal and takedown semantics are documented; no claims of available volunteers.

### 4. Close one real-life loop

Take **one** non-sensitive community task from request to a willing steward's acceptance to reported work to **independent human confirmation**. Preserve partial, refused, disputed, and unknown outcomes. The number of participating humans can be two, not a fabricated marketplace.

**Acceptance:** an independent reader can separate proposal / commitment / action / reporter / confirmer using traceable, privacy-respecting records.

### 5. Turn useful work into a reusable, independent field kit

Publish a printable and offline-capable template for a neighborhood table, growers, church group, campus team, or survivor-support organizer, without claiming any particular group's endorsement. Include copy, a little map of decisions, a safe refusal path, and a forkable recipe. Quantify recovered human time by explicit, optional observation; no engagement-maximizing feed.

**Acceptance:** one stranger can carry the kit to a different town or organization with no shared account, while keeping local authority and consent.

## What makes the site feel alive

- **The Porch:** start with a real particular; always receive something usable immediately.
- **One Small Move:** a human-scale action pack, not model theater.
- **The Kitchen / Garden:** food and material circulation experiments, clearly distinguished from operating services.
- **The Workbench:** experiments, demos, strange games and creative machines; delightful but never masquerading as field outcomes.
- **The Return Shelf:** public, consented, anonymized reports of confirmed work, honest failures and reusable methods, only after proof exists.

The JAR;VIS character can be playful. It must not pretend it found a volunteer or acted without authorization. The feedback bubble is itself a working public service only insofar as moderation and response actually happen.

## Promotion rule

This work is **stacked on unmerged FRONT-DOOR-002**. Do not move abundent.org apex, change Cloudflare DNS, disrupt webZ, or alter mail records to ship it. Validate staging in real mobile browser, link compatibility, security policy, receipts and rollback before promotion. A green PR, a READY Vercel deployment, and a tested synthetic workflow are different evidence levels.

**North-star measure:** verified useful acts returned to participants, plus time saved and honest no/unknown outcomes — **not** page views, AI calls, sign-ups, or number of connected repositories.
