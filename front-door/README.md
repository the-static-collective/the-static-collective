# FRONT-DOOR-002 — Abundent human-first entrance

A small, independent static site whose deployment must be distinct from webZ. It lives in the Collective identity repository at `front-door/` (not the webZ source tree) and requires no accounts, API keys, JavaScript runtime, analytics, form backend, tracking cookies, or package installation.

## Local run

```sh
cd front-door
python3 -m http.server 8080
# Open http://localhost:8080/
python3 -m unittest discover -s tests -v
```

## Human / computer contract

The visible homepage asks a particular, immediate question and offers exactly three choices (need, offer, explore). The third choice is an internal two-minute overview. Human pages speak plainly; computer discovery files point to source-owned technical books. Linked apps keep their separate identity, status and authority. A mailto link only drafts an email. No website action claims that someone has offered help, agreed to steward a task, or performed work.

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
