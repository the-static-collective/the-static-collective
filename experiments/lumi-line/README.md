# LUMI LINE 001 — telephone doorway (experimental)

**Status:** Source specimen + deployed fail-closed webhook gateway. A real phone number and the provider/API credentials are **not** provisioned by this repository. Deployment does not prove a successful call.

## Scope

- **Incoming voice:** Twilio/SIP -> OpenAI GPT-Live -> signed `live.transport.incoming` webhook -> allowlist -> accept/reject.
- **Incoming SMS:** Twilio signed form webhook -> allowlist -> optional bounded stateless OpenAI Responses reply.
- **Not included:** personal ChatGPT memory, private project access, files, phone-based identity proof, outgoing calls, a public help line, stored conversations, Twilio provisioning, or an opt-in ledger.
- **Default behavior:** disabled. Secrets and explicit enable toggles are required before paid AI use. No unauthenticated POST action succeeds.

## Endpoints

Hosted in Supabase Edge Functions on existing `pantry-gate` as **separate function** `lumi-line` (no database schema or existing functions changed).

```text
GET  https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/lumi-line/health
POST https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/lumi-line/openai
POST https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/lumi-line/sms
```

Supabase deployment must use `verify_jwt=false` **because providers send their own signed webhooks**. The handlers verify their signatures themselves, and default to 503 without configured secrets.

## Required one-time human-controlled account setup

1. Get a Twilio US number with inbound voice and SMS and configure a SIP route with TLS + **SRTP**. Check GPT-Live SIP availability in the selected OpenAI API project. OpenAI's SIP target is `sip:proj_YOUR_PROJECT_ID@sip.api.openai.com;transport=tls`; use the actual project ID, not the literal placeholder. Twilio Programmable Voice `<Dial><Sip>` also supports TLS/SRTP (with `secure=true`), but verify this against the purchased product's setup. Do not configure voice until transport security is confirmed.
2. In OpenAI's project settings, create a Webhook for **`live.transport.incoming`** pointing to `/openai`. Preserve the provided `whsec_...` signing secret. Create a scoped OpenAI API key for the same project; ChatGPT subscription access is not OpenAI API credit.
3. In the Twilio phone number's Messaging configuration, set the **incoming message webhook** to `/sms`, method POST; use the exact URL from the endpoint list above.
4. In Supabase project **Edge Function secrets**, configure the values below (never commit secrets or publish them in chat):

```text
OPENAI_API_KEY=<API key for the OpenAI project>
OPENAI_WEBHOOK_SECRET=<whsec_... from that project's webhook>
TWILIO_AUTH_TOKEN=<Twilio account auth token>
LUMI_SMS_URL=https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/lumi-line/sms
LUMI_ALLOWED_NUMBERS=+1XXXXXXXXXX
LUMI_ENABLE_VOICE=false
LUMI_ENABLE_SMS=false
```

5. After wiring the accounts, enable **one channel at a time** with `LUMI_ENABLE_VOICE=true` or `LUMI_ENABLE_SMS=true`, then field test from exactly the allowlisted number. Keep Twilio usage/spend limits and OpenAI API project budget alerts configured. Use test resources or short calls initially.

This is an **owner-only pilot**. Caller ID can be spoofed and is **not authentication** for accessing private data. A future private-data-enabled line must add stronger verification (PIN/device authorization), explicit project-specific read scopes, secure logging/retention choices, abuse throttling, and durable webhook deduplication.

## Probes

```bash
curl -sS https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/lumi-line/health
curl -i -X POST https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/lumi-line/openai -H 'content-type: application/json' -d '{}'
curl -i -X POST https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/lumi-line/sms -H 'content-type: application/x-www-form-urlencoded' -d 'Body=hello'
```

Expected: public health response showing both channels disabled; unsigned/unconfigured webhooks rejected; no model or telecom usage.

## Boundaries and receipts

Identity: **Lumi Line** is an independent AI-assisted telephone entry, *not* this ChatGPT session or a transfer of its existing memory. Observations are kept separate from capability claims; source code is not a field test.

Owner's current request (2026-11-14): prepare what we can on our end before buying/attaching a number.

References:
- https://developers.openai.com/api/docs/guides/voice-sip
- https://developers.openai.com/api/docs/guides/webhooks
- https://www.twilio.com/docs/voice/api/secure-media
- https://www.twilio.com/docs/voice/twiml/sip
- https://supabase.com/docs/guides/functions/auth
