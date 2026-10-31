# HELLO-011 — A front door that listens before showing doors

**Audience:** one visitor with a current thought, need, offer, wonder, or no idea at all.

**Principle:** one open invitation is better than a forced menu of three identities. The original three human paths remain accessible behind "I'd rather skip the machine" for accessibility and agency.

## What the prototype really does
- A small first-party **rules-based, deterministic JAR;VIS-inspired wayfinder** reads only the words in this browser tab.
- Matches human-facing topics to at most three known, already public URLs, preferring the most relevant. Unknown input is explicitly left unknown instead of forced into a role.
- The result is a contextual response plus independent doors, not an AI model, diagnosis, community match, or appointment.
- Example prompts and Surprise me let someone explore without typing.
- No visitor text is sent in URLs, network requests or a form; no cookies, browser storage, identity inference, profiling, accounts, auto-submission, analytics or remote model call.
- The separately deployed **ask JAR;VIS!** machine at `connections.abundent.org` is the fuller interactive route. The visitor may choose to go there; nothing they wrote on Hello is carried.
- The separately deployed human Porch at `/porch/` has explicit choices about sending a private note to a moderated queue with a receipt. No silent handoff.
- Every downstream project has its own consent, safety, and authority boundary.

## Expression guide
**Voice:** a spare folding table meets a 1999 desktop terminal. Neighborly, strange, sincere. Examples: "Ope. What landed on your porch?" and "The future is running a little late." Leave clear forms and statuses conventional: "Nothing has been sent."

**Do not:** claim live generative AI when it's a local router; announce a partner who hasn't joined; route urgent real-world needs to fictitious services; carry private stories in URLs; let a browser choice imply acceptance, volunteering, or publication.

## Apex migration is deliberately separate
HELLO-011 is tested at `hello.abundent.org` before changing `abundent.org`. The current apex remains webZ with many deep links. Moving the apex requires a path inventory, same-origin redirects or preserving legacy paths, source-backed routing rules, publication URL check, DNS/domain rollback and explicit verification. Never move the hostname and abandon the existing paths. Preserve Cloudflare mail and subdomains. Keep staging `noindex` intact until the migration is complete.

## Follow-on experiment
Future opt-in full JAR;VIS assistance can inspect the user question with an explicit send/review step and clear disclosure of model/provider and retention. The local router is a useful reliable fallback, not a simulation of having run a model.
