import {createClient} from 'npm:@supabase/supabase-js@2.95.0';
// AGENT COMMONS 015: no inference here, only bearer-seat atomic quota claims.
const db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(['groq','gemini','openrouter','cloudflare-nemotron']);
const hex=/^[0-9a-f]{64}$/;
const uid=/^[0-9a-f-]{36}$/;
const out=(v:unknown,status=200)=>new Response(JSON.stringify(v)+'\n',{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
async function hash(token:string){const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return [...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{
 try {
  const p=new URL(req.url).pathname.replace(/\/$/,'');
  if(req.method==='GET'&&p.endsWith('/health'))return out({schema:'agent-commons/party-015',status:'OPERATOR_SEAT_CLAIM_ONLY',providerCalls:false,publicProviderCalls:false,maxPerSeatPerDay:2,globalDailyMax:6,autoFallback:false,room:'first-table'});
  if(req.method!=='POST'||!(p.endsWith('/claim')||p.endsWith('/finish')))return out({error:'NOT_FOUND'},404);
  const auth=req.headers.get('authorization')??'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!/^[a-zA-Z0-9_-]{40,128}$/.test(token))return out({error:'AUTH_REQUIRED'},401);
  if(Number(req.headers.get('content-length')||0)>1000)return out({error:'BODY_LIMIT'},413);
  const raw=await req.text();if(new TextEncoder().encode(raw).length>1000)return out({error:'BODY_LIMIT'},413);
  let a:Record<string,unknown>;try{a=JSON.parse(raw)}catch{return out({error:'BAD_JSON'},400)}
  if(!a||Array.isArray(a)||typeof a!=='object')return out({error:'BAD_BODY'},400);
  const claim=p.endsWith('/claim');
  const fields=claim?['room','provider','context_sha256']:['claim_id','status','message_id'];
  if(Object.keys(a).length!==fields.length||!Object.keys(a).every(k=>fields.includes(k)))return out({error:'INVALID_FIELDS'},400);
  let result:unknown, error:{message?:string}|null=null;
  if(claim){
   if(a.room!=='first-table'||typeof a.provider!=='string'||!allowed.has(a.provider)||typeof a.context_sha256!=='string'||!hex.test(a.context_sha256))return out({error:'INVALID_CLAIM'},400);
   const response=await db.rpc('ac015_claim',{p_token_hash:await hash(token),p_room:a.room,p_provider:a.provider,p_context_sha256:a.context_sha256});
   result=response.data;error=response.error;
  } else {
   if(typeof a.claim_id!=='string'||!uid.test(a.claim_id)||!['HELD_SUBMITTED','PROVIDER_HOLD','SUBMISSION_HOLD'].includes(String(a.status))||(a.message_id!==null&&(typeof a.message_id!=='string'||!uid.test(a.message_id))))return out({error:'INVALID_FINISH'},400);
   const response=await db.rpc('ac015_finish',{p_token_hash:await hash(token),p_claim:a.claim_id,p_status:a.status,p_message:a.message_id});
   result=response.data;error=response.error;
  }
  if(error){
   const msg=String(error.message??'');
   const known=['AUTH_REQUIRED','WRONG_PROVIDER_SEAT','PROVIDER_DAILY_LIMIT','GLOBAL_DAILY_LIMIT','ALREADY_CLAIMED_NO_RETRY','FINISHED_NO_RETRY','WRONG_SEAT_MESSAGE','CLAIM_NOT_FOUND'];
   const code=known.find(x=>msg.includes(x))??'HELD_UNAVAILABLE';
   return out({error:code},code==='AUTH_REQUIRED'||code==='WRONG_PROVIDER_SEAT'?401:code.includes('LIMIT')?429:code.includes('RETRY')?409:code==='HELD_UNAVAILABLE'?503:400);
  }
  return out(result);
 }catch{return out({error:'HELD_UNAVAILABLE'},503)}
});