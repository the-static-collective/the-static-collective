# WEBSITE-CONVERGENCE-007 — the existing machine is bigger than the new Porch

**Reconnaissance date: 2026-10-30.** This is an operator-facing, source-linked convergence decision, not a new consumer product, a canonical source for other repositories, a deployment, or evidence of field adoption. Every project keeps its own code, release decisions and authority.

## Central finding: we nearly rebuilt things that already existed

Our staged identity-repository Front Door PRs #1–5 implement a humane Porch: need/offer/question, transient attention, next move, topical research and an optional self-report. They work as a *separate staged code line*.

However, webZ had already built **FIRST-INCH-001/002/003** (webZ #201–203): a one-question printable work card, a six-candidate deterministic planner, and source-pinned JAR;VIS public research with native Dogram/Toaster test handoffs. It also already built **FIELD-RETURN-013** (#112), a local truthful return that creates an unverified Free Graph candidate. **FINITE-DELIGHT-001** (#205) provides a three-card, intentionally finite one-stop arcade. **USE-FIRST-001** (#204) provides a consumer-oriented tool shelf including an actual released Windows application and existing browser demos. **TIMEBACK-CREATIVE/FILM** (#206–207) take a local card into optional native creative production.

These are *mostly OPEN DRAFTS*, not features confirmed to be live at the public apex. Duplicated implementation is not evidence of integration. **Stop producing a third or fourth competing first-card/return planner.** Review the existing source owners and choose a single, user-facing path with bounded source-preserving handoffs.

| User-visible need | Existing source-owner implementation | State observed | Convergence decision |
| --- | --- | --- | --- |
| Plain start / printable first move | [webZ FIRST-INCH #201](https://github.com/the-static-collective/webZ/pull/201) and [identity FRONT-DOOR #1](https://github.com/the-static-collective/the-static-collective/pull/1) | Separate open drafts | Keep the smaller identity Porch as **staged human entrance** until actual browser A/B validation; compare field outputs before promoting either. |
| Deeper deterministic action planning | [webZ FIRST-INCH #202](https://github.com/the-static-collective/webZ/pull/202) | Open draft; synthetic effort/permission model | Treat as an optional source-owned deeper planner, not a new hidden mandatory step or true feasibility engine. |
| Public research relevant to a question | [webZ FIRST-INCH #203](https://github.com/the-static-collective/webZ/pull/203), [JAR;VIS recent-work feed](https://github.com/the-static-collective/JAR-VIS/blob/main/commons/recent-work-v1.json), [planZ public attention](https://github.com/the-static-collective/planZ/blob/main/public/attention-v1.json) | Public editorial context; no live helper directory | Front-Door #4 is a bounded static projection; compare relevance/refusal behavior, do not create a second project authority. |
| Self-report and later review | [webZ FIELD-RETURN #112](https://github.com/the-static-collective/webZ/pull/112), [identity RETURN #5](https://github.com/the-static-collective/the-static-collective/pull/5) | Open drafts; self-reports only | A return card is **not** confirmed benefit. Preserve both original schemas; choose one visitor contract before connecting to receiver review. |
| A joyful short surprise, without an endless feed | [webZ THREE BELLS #205](https://github.com/the-static-collective/webZ/pull/205) | Open source draft | Optionally present as a *choice*, not an automatic reward loop. |
| Something useful to use right now | [webZ USE-FIRST #204](https://github.com/the-static-collective/webZ/pull/204) | Open source draft; links an actual official Toaster alpha release, other previews/kits | This should become an explicit one-click **Use a tool** door after source-owner release and route review, rather than a new site copy. |
| Printable/creative artifacts | [webZ TIMEBACK #206](https://github.com/the-static-collective/webZ/pull/206), [#207](https://github.com/the-static-collective/webZ/pull/207), [lemonPRESS](https://github.com/the-static-collective/lemonPRESS) | Source-native runs/CI, no automatic public browser execution | Optional export and explicit local operator execution, with independent rights and output review. |
| Carry a non-identifying next-room topic | [webZ CROSSINGS #138](https://github.com/the-static-collective/webZ/pull/138), [AUTO-CROSSINGS #140](https://github.com/the-static-collective/webZ/pull/140) | Open draft, 30-minute same-origin sessionStorage prototype | Cross-domain identity Porch **cannot** inherit another origin's sessionStorage. Use deliberate navigation, or separately review a typed public-only transport. Do not pass raw note or receipt keys. |
| Actual private, revocable submission | [JAR;VIS PORCH-RECEIVER #43](https://github.com/the-static-collective/JAR-VIS/pull/43), [webZ Living Inbox #167](https://github.com/the-static-collective/webZ/pull/167) | Distinct deployed/provider paths, authorization and schema differ | Never silently combine their queues or role grants. Prioritize authenticated operator/recipient check and deletion semantics. |
| Shared public conversation | [webZ WORKBOARD #126](https://github.com/the-static-collective/webZ/pull/126), [OPEN-SEATS #129](https://github.com/the-static-collective/webZ/pull/129) | Moderated Supabase Edge preview exists; source remains draft; no confirmed participating steward | Public **reviewed** feed is not verified truth; keep voluntary outreach behind separate approval. |
| Small circles and distributed invitations | [webZ Seven Days #121](https://github.com/the-static-collective/webZ/pull/121), [Campfire #124](https://github.com/the-static-collective/webZ/pull/124) | Independent invitation/experiment paths | Don't make a visitor join an invitation network to get one useful result. |
| Independently operated offline community nodes | [webZ Suitcase #183](https://github.com/the-static-collective/webZ/pull/183), [#185](https://github.com/the-static-collective/webZ/pull/185) | Digital protocol and proposed physical pilot gates | A candidate path for eventual cross-community independence; not required for a first-visit site. |
| An actual six-human gate for a community act | [webZ STATIC COMMONS #182](https://github.com/the-static-collective/webZ/pull/182) | Printable source-backed field kit, not completed action | Best next real field gate: ASK → ANSWER → SCOPE → ACT → independent CONFIRM → permitted RETURN. |
| Owner-operated contact and records | [webZ Post Office #170](https://github.com/the-static-collective/webZ/pull/170), [Bridge #180](https://github.com/the-static-collective/webZ/pull/180) | Explicit owner-only workflows; application/outreach remain human-held | Do not mix operator correspondence with public notes or invent sent messages. |

## Deployment and routing findings (not an HTTP availability audit)

Vercel currently lists **28 projects** in the connected team. The count does not mean 28 usable applications or 28 independently healthy public services. For example, the dedicated `abundent-front-door-002` project has a READY staged deployment and `hello.abundent.org` is configured to it, but a preview build is not an apex rollout. `abundent-switchboard` has a READY production deployment and a verified project-owned `abundent-switchboard.vercel.app` address.

**Confirmed config defect:** Vercel's domain-config read currently marks **`apps.abundent.org` misconfigured**: DNS CNAME resolves to `the-static-collective.github.io.`, while `apps.abundent.org` is attached to the **Vercel** `abundent-switchboard` project. The GitHub Pages target may be a separate intended release, but it must not be presumed equivalent or healthy. This is a target-authority conflict that requires a deliberate hosting choice and actual HTTP tests before changing DNS. Do not touch MX/SPF/DKIM, the apex, unrelated sites, or Mail.

Other Vercel project reads show `reality2-waseca-001` and `abundent-becoming-036` with **latest deployment state ERROR** on October 29, even though other previously READY releases may still serve their custom domains. **Latest ERROR does not prove the custom domain is currently down; no external HTTP proof succeeded during this reconnaissance.** Do not automatically quarantine those independent services based on one deployment status.

Historical infrastructure [webZ #157](https://github.com/the-static-collective/webZ/pull/157) explains Vercel Hobby's deploy fan-out and a vendor-independent static builder: use **batched Git commits**, manual intentional release, and explicit target inspection. No broad alias repointing to save an extra click.

The staged `/doors/` route can **offer the independently project-owned Vercel Switchboard hostname as a clearly labeled fallback**, while retaining the expected `apps.abundent.org` reference and its known repair status. The fallback is a *configured deployment*, not independently HTTP-tested.

## High-value convergence decisions

1. **One entrance.** The identity Front Door, not ten equally prominent entrances, asks what is on the person's mind. The webZ worlds remain **independent destinations**. Never mandate a profile, training, or repository tour.
2. **One optional context lens.** The human can inspect relevant source-owned public tools and research *after* receiving a useful first step; source and freshness remain visible.
3. **One honest crossing.** If we need multi-domain carry, first test a sanitized, explicit transport compatible with the *actual owner schema* in webZ CROSSINGS-032. Do not send raw notes, private receipt tokens or sensitive case data into URL/search/session storage.
4. **One real human loop.** Prefer STATIC COMMONS-001's six-hand sequence over another synthetic demonstration. A receiver's express permission and independent confirmation are separate from a visitor's self-report.
5. **One purposeful delight.** Reuse Three Bells, LemonPRESS, PlayDeck and Toaster as optional, voluntary artifacts. A visitor can also leave with just a useful sentence. Attention is never owed.
6. **One coherent release ledger.** Distinguish source merged, draft, deployed preview, reachable production, real consent and verified field outcome as independent axes. READY `!=` used; URL `!=` available; consent `!=` participation.

## Next executable crossing (source review, not silent transplant)

Create a **source-pinned cross-domain public handoff specimen** comparing:
- identity Porch's personal note + local first action;
- webZ CROSSINGS-032 `abundent/public-crossing/v0` strictly public-only ticket (no question, keys or personal narratives);
- webZ FIRST-INCH and RETURN contracts;
- webZ STATIC COMMONS six-hand field kit, as the *distinct* human confirmation destination.

The only legitimate automatic output before receiving authority is a **proposed topic/destination with all authority false**. Show a manual source-directed navigation choice. Add phone and privacy regression tests. Keep transport ownership in the source repo; no private receipt moved, no automatic cross-post, no assumed partner.

Do not write another global portal or aggregator until this narrow handoff demonstrates **a benefit to a stranger**, verified separately from source CI.

## Evidence limitations

This audit checked GitHub project-owned PR bodies, selected source documentation, and connected Vercel project/domain status on 2026-10-30. It did **not** establish external unauthenticated HTTP reachability for the custom sites, a successful physical-device trial, a linked partner, completed real-world work, or the legal redistribution status of any program. Open PRs are not merged architecture. The nearby Static Collective GitBook Front Room is an orientation landmark only; this page is a separate, dated operator decision record.
