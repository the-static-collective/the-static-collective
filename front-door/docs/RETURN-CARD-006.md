# RETURN-CARD-006 — a brick without counterfeiting confirmation

**Status:** draft staging feature, not a verified service, public report, human-witness receipt or reLATTE signature.

## The point

A visitor can arrive with a need, offer or question and leave with something immediately useful. An optional later moment of attention may be:

- I tried it and made progress.
- Not yet.
- I chose not to.
- I am not sure.

All four are honest return states. None creates guilt, obligation, social pressure or an implied promise.

## What runs

```text
human's original Porch note
       +
temporary attention / local next move
       ↓
optional personal return question
       ↓
user chooses one truthful state + optional 220-character observation
       ↓
LOCAL, SELF-ATTESTED TEXT
       ↙               ↘
copy (explicit)      save .txt (explicit)
```

No account, input upload, model, third-party network call, analytics, localStorage, timer, gamification or backend addition. The user can close the tab or erase the note. The private receiver-009 / JAR;VIS operator queue is separate and unchanged; a return does not enter it automatically. No public publication and no independent human review.

The return card includes the particular and local first action and is therefore potentially personal. The page explicitly discourages names, addresses and other people's private stories, and copying/saving remains a deliberate choice. It should never be interpreted as a legally or cryptographically authenticated field report, recipient confirmation, partner permission or verified WE'VE.

## Where existing organs fit later (not implemented here)

- **BananaSpork:** existing need → offer → report → receiver confirmation lifecycle has separate authenticated roles. It can *consider* a permissioned, source-identified proposal in future; it must not accept this unsigned text as a confirmation.
- **reLATTE:** future signed transport may carry an attributable claim to a receiver for independent HOLD, ADMIT or REFUSE. Nothing in this file is signed or admitted.
- **webZ Living Receiver:** accepts only explicitly known schemas with review semantics. Do not advertise this format as automatically importable into it.
- **JAR;VIS / planZ:** could later help a consenting operator refine a task and request independent validation, but cannot auto-upgrade self-report to field truth.
- **GRAFT / LemonPRESS:** only a separately approved, privacy-reviewed and permitted outcome should become a reusable public method or cultural artifact.

This small personal return is intentionally weaker than a shared verified action. That weakness makes it safe to start alone.

## Checks

- `node --test porch/*.test.mjs`: all personal outcomes, invalid cases and nonmutation of original note.
- `python3 -m unittest discover -s tests -v`: return card DOM and source separation.
- Validate mobile browser copy/save and keyboard controls before any apex promotion.
- Don't change existing domains, mail records, private moderation or real-world programs to ship this slice.

## Next field proof

A consenting person sends a **separate, explicitly permitted** non-sensitive record to a qualified human receiver. That receiver may refuse, report their own perspective, or confirm a narrowly scoped actual act. Only verified independent outcome policies may later classify it as a shared result.

**A return note is a person's own witness, not an authority over somebody else's world.**
