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
