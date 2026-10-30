# FRONT-DOOR-002 — Abundent human-first entrance

A small, independent static site whose deployment must be distinct from webZ. It lives in the Collective identity repository at `front-door/` (not the webZ source tree) and requires no accounts, API keys, server-side runtime, third-party JS, analytics, form backend, tracking cookies, or package installation. The human porch uses a small first-party client-side JavaScript note composer; no drafts are transmitted or persisted.

## Local run

```sh
cd front-door
python3 -m http.server 8080
# Open http://localhost:8080/
python3 -m unittest discover -s tests -v
node --test porch/*.test.mjs
```

## Human / computer contract

The visible homepage asks a particular, immediate question and offers exactly three choices (need, offer, explore). Need and offer enter the new [human porch](porch/), which turns a thought into a portable note with explicit human-controlled copy, save, or email action. It is deliberately distinct from webZ's offline sovereign-world invitation rehearsal. See [HUMAN-PORCH-002](docs/HUMAN-PORCH-002.md). The third choice is an internal two-minute overview. Human pages speak plainly; computer discovery files point to source-owned technical books. Linked apps keep their separate identity, status and authority. A mailto link only drafts an email. No website action claims that someone has offered help, agreed to steward a task, or performed work.

## Status and promotion gate

This branch is **STAGING, NOT APEX**. Its HTML and robots policy intentionally suppress search indexing. Site source should be associated with a separate Vercel project. Do **not** change DNS or transfer `abundent.org` until:
1. Verify staging in a real mobile and desktop browser; check actual outbound links and accessibility.
2. Check every existing path under `abundent.org` for traffic and compatibility; ensure webZ still works at `webz.abundent.org`.
3. Capture and test a reversible migration manifest: old routes to webZ or new paths, explicit 301/308 mapping if needed, and a working rollback.
4. Remove staging badges/noindex/robots disallow, update machine references to canonical domain and redeploy.
5. Change only the required Vercel project-domain assignment and authoritative Cloudflare records; preserve mail (MX/TXT/DKIM/SPF) and unrelated subdomains. Verify public HTTPS, redirects, subpages, and rollback.

Observed 2026-10-30: authoritative NS are Cloudflare; `abundent.org` and `www` are assigned to Vercel's webz-field-porch; `apps.abundent.org` is assigned to a separate Vercel project yet Cloudflare CNAME still targets GitHub Pages. Do not presume that mismatch has been repaired.

## Own the copy, not people's identities

Keep the retro JAR;VIS visual character as an accent, and let real people's particular needs lead. A link is not a promise of availability, an organization is not necessarily formed, and metadata is not permission.

## NEXT-MOVE-003 · Immediate usefulness (staging)

The human porch now gives a **local ten-minute next move**, separately from its unsent note. Transparent deterministic rules suggest one bounded action, one condition for useful progress, a consent/safety boundary, and an honest return status; a visitor can copy the plan without sending anything. This does not invoke live JAR;VIS models, search volunteers, assign tasks, or prove any field fulfillment. See [USEFUL-WORK-003](docs/USEFUL-WORK-003.md) for the gated path from one useful note to one confirmed human act. This follow-up is stacked on the unmerged front-door feature, not promoted to the apex.

## ATTENTION-FLOW-004 · Proximity by interest, not identity (staging)

The immediate next move now takes an optional, **momentary attention window**: half a minute, a few minutes (default), or a little more room. A need, offer, or question is a current direction of attention, never a permanent user classification. No countdown, points, account, persistent profile, API call, ranking of people, automatic contact, or new backend. The selector is **not included in exported or privately submitted notes**. The front-door headline speaks to whatever the visitor is carrying, rather than assuming everyone arrives asking for help.

[ATTENTION-FLOW-004](docs/ATTENTION-FLOW-004.md) records the longer boundary: useful local artifact first, optional consented interest-proximity afterward, verified human action only when it actually happens. No flow-matching network has been deployed.

## INTEREST-ROADS-005 · Public source proximity without user profiling (staging)

The Porch now has a **collapsed optional research drawer**. Only when the visitor opens it, a fixed same-origin JSON snapshot of JAR;VIS's reviewed public-work index and planZ's separately reviewed public plan index is read and matched locally against the current note. It shows up to 3 documented projects and 1 open question, with original source links, review date and frank status. It neither sends visitor text nor creates a match, task, contact, or service request. Empty/invalid/unavailable sources fail visibly to no recommendation, without affecting the human's own note, next action, or opt-in private submission. [Read the provenance and gates](docs/INTEREST-ROADS-005.md).

The snapshot is a **deliberate dated copy**, not an auto-refreshing database. Refresh only after inspecting the two source owners' current public indexes and independent project links. No new remote model, key, account, analytics, storage or backend.

## RETURN-CARD-006 · Personal return, not verified fulfillment (staging)

After preparing one small move, a visitor can optionally record **I tried / Not yet / I chose not to / Not sure**, plus 220 characters of their own observation, then deliberately copy or save a plain text file. The return is **self-attested, local, unsigned, and unsent**. It does not enter the private review queue, create a confirmed receipt, claim another person's participation, or publish anything. See [the limits and future independent-review gate](docs/RETURN-CARD-006.md).

## WEBSITE-CONVERGENCE-007 · Reconciling the already-built front doors (draft)

[Read the evidence-based operator inventory](docs/WEBSITE-CONVERGENCE-007.md). A source audit of the last two weeks found overlapping webZ FIRST-INCH, FIELD-RETURN, THREE BELLS, USE-FIRST, CROSSINGS, Living Inbox, Workboard, Garden, and creative production functionality; these must be compared and composed before making yet another competing front door. Existing open PRs are not production releases.

**One small staged routing repair:** the `/doors/` Switchboard card now clearly calls out a confirmed `apps.abundent.org` DNS/hosting mismatch and offers its separately Vercel-verified `abundent-switchboard.vercel.app` project hostname as an untested alternate. No DNS, project alias, backend or mail configuration was changed; actual unauthenticated HTTP behavior still needs manual checking.

## OPERATOR-ROUTES-008 · Pick the job, open the source-owned machines (staging)

The optional, account-free `/work/` **Work Desk** translates a real non-sensitive objective into a small, portable, source-linked action brief using the existing Porch next-move engine, a curated and status-labeled registry of **31 original source-owned capabilities**, and **eight job-specific routes**. It optionally reuses JAR;VIS/planZ public interest matching on a separate click. Every capability retains a link to the source owner, readiness and consent gate; draft experiments are not treated as deployed services. Copy or download Markdown or explicitly **non-executable JSON**. No participant matching, DNS change, project execution, volunteer outreach, grant submission, chat account, profile, model call or storage is implied. The first human Porch remains the simpler path. See [OPERATOR-ROUTES-008](docs/OPERATOR-ROUTES-008.md).

The front-door GitHub workflow now runs all Porch and Work Desk unit tests. Review the exact hosted `/work/` route and mobile usability before release.

### CROSS-ROOM-009 · one real source-native crossing contract (staging)

The optional Work Desk ticket export follows **webZ's actual `abundent/public-crossing/v0` schema**, validated in CI against original webZ `readCrossing` / `makeCrossing` / `makeReturn` at pinned commit `963b047a414a5822a82681fd838dfdadeb5c8c41`. A visitor deliberately selects public-only topic/capacity, acknowledges limits, and downloads a local JSON file with all authority flags false. No user text, identity or receipt is included; no destination is contacted or enrolled. This is a real code-contract crossing, not live multi-user interoperability. See [technical gates](docs/OPERATOR-ROUTES-008.md#cross-room-009--proven-compatible-with-the-original-webz-receiver-staging).

## NATIVE-OUTPUT-010 · Original output engines (staging)

The optional `/work/makers/` page explains the new dedicated native GitHub Actions execution. It checks out **original source-owned code at exact pinned commits** and executes CANNON CULTURE FORGE 005 through webZ, GrO, lemonPRESS, Full Measure, PENNY, GHoT, reLATTE, planZ, GRAFT and JAR;VIS. From actual byte-inspected output receipts, the independent **original Free Graph engine** creates a content-addressed packet, machine-verifies it, and yields `source-graph.svg`, `comic.html`, `field-card.md`, and the genuine donor receipts as downloadable GitHub Action run artifacts. Nothing is automatically sent, admitted, paid, published or field-confirmed. A visitor cannot activate these other repositories from the static website; operator/CI execution and future owner-controlled dispatch are separate. Details: [native source proof](docs/NATIVE-OUTPUT-010.md).
