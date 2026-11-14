// LUMI LINE 001 — isolated Supabase Edge Function.
// No trusted project data, memory, tools, or outbound calling is connected.
// Webhook endpoints fail closed; explicit operator opt-in is required for paid AI use.

const encoder = new TextEncoder();
const env = (key) => (Deno.env.get(key) ?? "").trim();
const isOn = (key) => env(key).toLowerCase() === "true";
const allowedNumbers = () => new Set(env("LUMI_ALLOWED_NUMBERS").split(",").map((x) => x.trim()).filter((x) => /^\+[1-9]\d{7,14}$/.test(x)));
const toNumber = (value) => (String(value ?? "").match(/\+[1-9]\d{7,14}/) ?? [])[0] ?? "";

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
function base64Bytes(value) {
  try { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); }
  catch { return null; }
}
function base64Encode(bytes) {
  return btoa(Array.from(new Uint8Array(bytes), (b) => String.fromCharCode(b)).join(""));
}
async function signHmac(secretBytes, message, hash) {
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}
async function validOpenAIWebhook(req, body) {
  const secret = env("OPENAI_WEBHOOK_SECRET");
  const id = req.headers.get("webhook-id") ?? "";
  const timestamp = req.headers.get("webhook-timestamp") ?? "";
  const signatures = req.headers.get("webhook-signature") ?? "";
  if (!secret || !id || !/^\d{10}$/.test(timestamp) || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const secretBytes = base64Bytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  if (!secretBytes) return false;
  const expected = await signHmac(secretBytes, `${id}.${timestamp}.${body}`, "SHA-256");
  return signatures.split(/\s+/).some((s) => {
    if (!s.startsWith("v1,")) return false;
    const received = base64Bytes(s.slice(3));
    return received !== null && equalBytes(received, expected);
  });
}
async function validTwilioWebhook(req, rawBody) {
  const token = env("TWILIO_AUTH_TOKEN");
  const exactUrl = env("LUMI_SMS_URL");
  if (!token || !exactUrl || !req.headers.get("X-Twilio-Signature")) return false;
  // The exact configured Twilio webhook URL is required (host rewrites break signatures).
  if (req.url !== exactUrl) return false;
  const parameters = new URLSearchParams(rawBody);
  const keys = [...new Set(parameters.keys())].sort();
  let signed = exactUrl;
  for (const key of keys) for (const value of parameters.getAll(key)) signed += key + value;
  const calculated = await signHmac(encoder.encode(token), signed, "SHA-1");
  const received = base64Bytes(req.headers.get("X-Twilio-Signature") ?? "");
  return received !== null && equalBytes(received, calculated);
}
const xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const smsXml = (message = "") => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><Response>${message ? `<Message>${xmlEscape(message)}</Message>` : ""}</Response>`,
  { headers: { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" } }
);
const json = (value, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
async function openAI(path, data, token) {
  return fetch("https://api.openai.com/v1/" + path, {
    method: "POST",
    headers: { "authorization": "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(18000),
  });
}
async function voiceWebhook(req) {
  if (!env("OPENAI_WEBHOOK_SECRET")) return json({ error: "webhook_not_configured" }, 503);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "content_type" }, 415);
  const raw = await req.text();
  if (raw.length > 20000 || !(await validOpenAIWebhook(req, raw))) return json({ error: "invalid_signature" }, 401);
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
  if (event?.type !== "live.transport.incoming" || event?.data?.type !== "sip") return json({ received: true });
  const sessionId = event?.data?.session_id;
  if (typeof sessionId !== "string" || !/^live_[a-zA-Z0-9_-]{1,120}$/.test(sessionId)) return json({ error: "session_id" }, 400);
  const callerHeader = event?.data?.sip_headers?.find((x) => String(x?.name ?? "").toLowerCase() === "from")?.value;
  const caller = toNumber(callerHeader);
  const token = env("OPENAI_API_KEY");
  if (!token || !isOn("LUMI_ENABLE_VOICE")) return json({ error: "voice_not_enabled" }, 503);
  const canAnswer = !!caller && allowedNumbers().has(caller);
  const url = `live/sessions/${encodeURIComponent(sessionId)}/${canAnswer ? "accept" : "reject"}`;
  const payload = canAnswer
    ? { session: {
        type: "live", model: "gpt-live-1",
        instructions: "You are Lumi Line, an experimental independently hosted AI telephone assistant. Introduce yourself as an AI assistant. Be conversational and concise. This line does not have access to the caller's ChatGPT chats, memories, GitHub, private documents, or tools. Never imply access, remembered personal context, or authority to take actions. Do not place calls or make promises about future work.",
        audio: { output: { voice: "marin" } }
      } }
    : { status_code: 603 };
  let response;
  try { response = await openAI(url, payload, token); }
  catch { return json({ error: "upstream_unavailable" }, 502); }
  if (response.ok) return json({ received: true, disposition: canAnswer ? "accepted" : "rejected" });
  const detail = (await response.text()).slice(0, 500);
  if (response.status === 409 && detail.includes("decision_already_made")) return json({ received: true, disposition: "already_decided" });
  return json({ error: "call_control_failed", upstream_status: response.status }, 502);
}
function extractOutput(response) {
  return (response?.output ?? []).flatMap((o) =>
    o?.type === "message" ? (o?.content ?? []).filter((c) => c?.type === "output_text").map((c) => String(c.text ?? "")) : []
  ).join(" ").trim();
}
async function smsWebhook(req) {
  if (!env("TWILIO_AUTH_TOKEN") || !env("LUMI_SMS_URL")) return json({ error: "twilio_not_configured" }, 503);
  if (!req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) return json({ error: "content_type" }, 415);
  const raw = await req.text();
  if (raw.length > 15000 || !(await validTwilioWebhook(req, raw))) return json({ error: "invalid_signature" }, 401);
  const params = new URLSearchParams(raw);
  const caller = params.get("From") ?? "";
  const message = (params.get("Body") ?? "").trim();
  if (!allowedNumbers().has(caller)) return smsXml();
  if (!isOn("LUMI_ENABLE_SMS") || !env("OPENAI_API_KEY")) return smsXml("Lumi Line is connected, but AI replies are not enabled yet.");
  if (!message || message.length > 1200) return smsXml("Please send a message under 1,200 characters.");
  if (/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT|START|YES|HELP)$/i.test(message)) return smsXml();
  let response;
  try {
    response = await openAI("responses", {
      model: "gpt-5.4-mini",
      store: false,
      instructions: "You are Lumi Line, an independently hosted, stateless AI SMS assistant. Clearly identify as AI when first responding. This is not the user's ChatGPT conversation and you do not have access to their past chats, memories, accounts, projects, or files. Do not claim actions or personal knowledge. Do not invite sensitive data. Write at most 300 characters, practical and concise.",
      input: message,
      max_output_tokens: 300,
    }, env("OPENAI_API_KEY"));
  } catch { return smsXml("Lumi Line is temporarily unavailable."); }
  if (!response.ok) return smsXml("Lumi Line could not process that message.");
  let answer;
  try { answer = extractOutput(await response.json()); }
  catch { answer = ""; }
  return smsXml((answer || "I received that, but could not form a reply.").slice(0, 450));
}
Deno.serve(async (req) => {
  const route = new URL(req.url).pathname.replace(/\/$/, "");
  if (req.method === "GET" && (route.endsWith("/health") || route.endsWith("/lumi-line"))) {
    return json({ service: "lumi-line", version: "001", deployed: true,
      voice_enabled: isOn("LUMI_ENABLE_VOICE") && !!env("OPENAI_API_KEY") && !!env("OPENAI_WEBHOOK_SECRET") && allowedNumbers().size > 0,
      sms_enabled: isOn("LUMI_ENABLE_SMS") && !!env("TWILIO_AUTH_TOKEN") && !!env("LUMI_SMS_URL") && !!env("OPENAI_API_KEY") && allowedNumbers().size > 0,
      memory_connected: false, project_tools_connected: false, outbound_enabled: false });
  }
  if (req.method !== "POST") return json({ error: "not_found" }, 404);
  if (route.endsWith("/openai")) return voiceWebhook(req);
  if (route.endsWith("/sms")) return smsWebhook(req);
  return json({ error: "not_found" }, 404);
});
