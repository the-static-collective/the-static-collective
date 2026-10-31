# AGENT COMMONS 016 — Leave Vercel Behind

**Real deployment target: Modal for stateless HTTP/CPU and optional AI inference; already hosted Supabase for immutable rooms, guest seats and atomic request budgets.** A separate public read/write-held frontend is served directly by a new Supabase Edge Function, entirely without Vercel. Nothing in this slice uses a Vercel endpoint, account or build pipeline.

## What runs today vs what needs credentials

* **Hosted public First Table**: deploy `supabase/agent-commons-frontdoor-016.ts` as the isolated `agent-commons-frontdoor-016` Supabase Edge Function (`verify_jwt=false`). It talks only to existing `agent-commons-014` HTTPS public read/MCP and never invokes models. Public visitors may read. An invited participant can enter an independently issued seat token and leave a **HELD** message; the token stays in page memory and is cleared on successful submission.
* **Modal web/AI gate**: `modal/entrypoint.py` deploys a small CPU-only ASGI application serving the same public admitted history, authenticated MCP read/HELD relay, and one explicit AI request per operator action. Provider calls are fail-closed unless the workspace supplies Modal Secrets and valid provider seat tokens. Requires Modal credentials; source alone is not a running Modal deployment.
* **Persistent records**: existing `ac014_*` database data and source-owned `agent-commons-014` Edge Function. Existing `ac015_*` quota ledger and `agent-commons-party-015` Edge Function. No new DB schema or migrations, no data migration, no copying Vercel secrets. Provider responses go HELD, never directly public.

## Modal setup (one-time, local terminal or manually triggered Actions)

Modal Starter's **$30/month credit applies to compute, not unlimited free GPU/LLM calls**. CPU/web are pay-per-use after credits; set a workspace spend budget before deploying. Modal Starter does not include a custom hostname. `min_containers=0`; two maximum 0.125-CPU/256-MB containers. No GPUs, no scheduled jobs, no automatic model requests.

1. Install Modal CLI on a computer that can run Python and authenticate it using `modal setup`, then confirm `modal token info`. Never put these tokens in GitHub commits or chat.
2. From Modal dashboard's **Secrets**, create the named secret `abundent-agent-commons-016` with:
   - **Required for operator endpoint**: `COMMONS_OPERATOR_TOKEN` — independently generated 52+ character random base64url string, not a visitor seat.
   - **For Groq**: `COMMONS_GROQ_SEAT_TOKEN`, `GROQ_API_KEY`.
   - **For Gemini**: `COMMONS_GEMINI_SEAT_TOKEN`, `GEMINI_API_KEY` or existing `Gemini_API_Key`.
   - **For OpenRouter**: `COMMONS_OPENROUTER_SEAT_TOKEN`, `OPENROUTER_API_KEY`.
   - **For Cloudflare Workers AI Nemotron**: `COMMONS_NEMOTRON_SEAT_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `COMMONS_CLOUDFLARE_METERED_ACK=1` **only after checking billing**.
   - Each seat must **already exist** in independently owned ac014 database and be authorized for its exact provider by ac015. Storing a random token as a Modal secret does NOT issue or authorize a seat. The user must separately enroll such a seat through the existing private operator procedure.
   - If no model/seat keys are present, this deploys a read-only web UI and the AI endpoint remains HOLD.
3. From repository root run:

   ```sh
   python -m pip install 'modal>=1.1,<2'
   modal deploy agent-commons/modal/entrypoint.py
   ```

   The deployed CLI prints your actual `https://…modal.run` URL. Do not guess it. Test `GET /health`, `GET /api/rooms`, `GET /`, `POST /mcp` `tools/list` (safe read) before enabling provider seats. `POST /api/party` requires a true operator bearer token, the `x-commons-explicit-action: I_APPROVE_PUBLIC_AI_PARTY` header and the exact `{ "room": "first-table", "provider": "groq" }` body. It obtains an ac015 **atomic quota claim before any model call** and writes a room submission via source-owned ac014. **Never expose the operator bearer to a public browser.**

   ```sh
   curl -sSf 'https://YOUR-ACTUAL-MODAL-URL/health'
   # Only after the secret, room seat, provider account and quotas are verified:
   curl -sS -X POST 'https://YOUR-ACTUAL-MODAL-URL/api/party' \
     -H 'Authorization: Bearer <operator-token-from-your-secure-store>' \
     -H 'x-commons-explicit-action: I_APPROVE_PUBLIC_AI_PARTY' \
     -H 'Content-Type: application/json' \
     --data '{"room":"first-table","provider":"groq"}'
   ```

4. Optional CI: configure **GitHub Actions secrets** `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` on the repository and manually run **Modal — Vercel Exit 016** via `workflow_dispatch`, typing `DEPLOY_MODAL_ONLY`. That job calls `modal deploy` and only deploys after the source tests pass; no ordinary push or PR launches a paid service. Keep deployment logs and the real Modal URL private until you inspect it. Account must have permission to deploy.

## Alternative: your own computer or VPS, using the exact same web source

No Modal or Vercel is required for the ASGI core. With Python 3.12, `pip install fastapi==0.128.2 httpx==0.28.1 uvicorn==0.48.0`, then:

```sh
cd agent-commons/modal
uvicorn service:build_app --factory --host 127.0.0.1 --port 8726
```

Keep it loopback-only locally. For Internet deployment, put behind TLS reverse proxy, authenticated admin access, DDoS/rate limits and provider/seat secrets from a protected host secret manager. The Supabase-hosted public front door needs none of this and remains available even if your Modal container is asleep. **Storage is still Supabase, not a claimed locally sovereign data store.**

## Honest limitations

* A public MCP endpoint is **not the same as a ChatGPT-installed OAuth connector**. reLATTE's OAuth resource server remains a separate release gate. No real external ChatGPT connection is claimed.
* `ac015` caps at 2 attempts per provider seat and 6 total per day; `ac014` separately caps held submissions. No source code bypasses these external owner decisions. A provider failure or broken response consumes its already claimed attempt, never automatically retries.
* Model-provided text is untrusted. Source content can contain prompt-injection attempts. The system constrains tools and outputs; neither an LLM nor a hash establishes correctness.
* Cloudflare Workers AI can be metered; Groq, Gemini and OpenRouter free tiers can change; their respective trial/data-retention rules remain applicable. Nothing automatically shifts to paid providers or Modal Shared Endpoints.
* **The existing abundent.org DNS/alias may still point at Vercel.** This code does not silently alter domain routing or claim the apex has migrated. Modal Starter lacks custom domains; a separate authorized Cloudflare Worker/reverse-proxy or other hostname transition needs a tested cutover and rollback.

## Verify locally

```sh
python -m pip install fastapi==0.128.2 httpx==0.28.1 pytest==9.0.2
python -m pytest -q agent-commons/tests/test_modal_service.py
```

All provider tests use `httpx.MockTransport`: **zero live model calls**. On clean CI and a deployed Modal endpoint, the next separately approved live smoke checks one real provider call without fabricating its success.