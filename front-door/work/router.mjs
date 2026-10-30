// OPERATOR-ROUTES-008. Local launch plans only. No project executor, recipient, account or server mutation.
import {makeNextMove} from "../porch/next-move.mjs";
export const ROUTE_SCHEMA="abundent/operator-routes-v1";
const stateLabels=Object.freeze({
 HERE_STAGED:"Staged on this website's draft branch",
 PUBLIC_SOURCE:"Public source index only",
 DRAFT_REVIEW:"Source-owned draft, not a shipped public tool",
 DOCUMENTED_IMPLEMENTATION:"Documented source implementation; not a verified public service",
 BACKEND_REVIEW_GATED:"Backend/prototype with independent human review and access gates",
 RELEASED_SOFTWARE:"Officially published application; inspect device and license limits",
 CONFIGURED_HOST_UNVERIFIED_HTTP:"Host configured, independent public HTTP check pending"
});
const isHttps=url=>{
 try{const x=new URL(url);return x.protocol==="https:"&&!x.username&&!x.password&&!x.hash}
 catch{return false}
};
const isSafeDoor=url=>url==="/porch/"||isHttps(url);
const idsUnique=items=>new Set(items.map(x=>x.id)).size===items.length;
export function checkRoutes(data){
 if(!data||data.schema!==ROUTE_SCHEMA||!Array.isArray(data.capabilities)||!Array.isArray(data.journeys)
    ||data.capabilities.length<1||data.capabilities.length>100||data.journeys.length<1||data.journeys.length>25
    ||!/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedOn||"")
    ||!idsUnique(data.capabilities)||!idsUnique(data.journeys))throw Error("The source-owned route registry is not available.");
 const found=new Set();
 for(const c of data.capabilities){
  if(typeof c.id!=="string"||!(/^[a-z0-9-]{3,48}$/).test(c.id)
    ||typeof c.label!=="string"||c.label.length>110
    ||!Object.hasOwn(stateLabels,c.state)
    ||typeof c.boundary!=="string"||c.boundary.length>420
    ||!isSafeDoor(c.openUrl)||!isHttps(c.sourceUrl))throw Error("A capability has an invalid boundary or link.");
  found.add(c.id);
 }
 for(const j of data.journeys){
  if(typeof j.id!=="string"||!(/^[a-z0-9-]{3,48}$/).test(j.id)||typeof j.label!=="string"
    ||typeof j.need!=="string"||typeof j.start!=="string"||typeof j.gate!=="string"
    ||typeof j.template!=="string"||!Array.isArray(j.capabilities)||j.capabilities.length<1||j.capabilities.length>12
    ||new Set(j.capabilities).size!==j.capabilities.length
    ||!j.capabilities.every(x=>found.has(x)))throw Error("A job references missing or invalid source owners.");
 }
 return data;
}
export function makeWorkLaunch({journeyId,particular,attention="few"},catalog){
 checkRoutes(catalog);
 if(typeof particular!=="string"||particular.trim().length<8||particular.length>420)throw Error("Describe the particular job in 8–420 characters.");
 // This is explicitly an exportable operator brief; block obvious credentials and contact data.
 if(/(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:api[_-]?key|password|secret)\b\s*[:=]|\bbearer\s+[A-Za-z0-9_-]{6,})/i.test(particular))throw Error("Remove email addresses, credentials or secrets from this exportable brief.");
 const journey=catalog.journeys.find(x=>x.id===journeyId);
 if(!journey)throw Error("Choose one available job.");
 if(!["glance","few","longer"].includes(attention))throw Error("Choose a valid attention window.");
 const capabilityById=new Map(catalog.capabilities.map(c=>[c.id,c]));
 const owners=journey.capabilities.map(x=>({ ...capabilityById.get(x),statusText:stateLabels[capabilityById.get(x).state]}));
 const local=makeNextMove({kind:"question",particular:particular.trim(),next:journey.start},{attention});
 const first=local.first;
 const lines=[
 "# ABUNDENT / WORK LAUNCH CARD",
 "**Proposed only · nothing sent, deployed, scheduled, or executed**",
 "",
 "**Job:** "+journey.label,
 "**Particular:** "+particular.trim(),
 "**Source index reviewed:** "+catalog.reviewedOn+" (not a live availability check)",
 "",
 "## Do one thing now",
 first,
 "",
 "## What existing machines can contribute",
 ...owners.flatMap((o,i)=>[
  (i+1)+". **"+o.label+"** — "+o.statusText,
  "   What it actually means: "+o.boundary,
  "   Open: "+o.openUrl,
  "   Source/evidence: "+o.sourceUrl
 ]),
 "",
 "## Human or source-owner gate",
 journey.gate,
 "",
 "## Honest next observation",
 "Record only what you personally know: NOT YET / REFUSED / SELF-REPORTED / INDEPENDENTLY CONFIRMED (only with separately inspectable evidence). A link or test is not a field result.",
 "",
 "**Take this card into a source-owned tool manually. It is not accepted as a native JAR;VIS, planZ, reLATTE, or BananaSpork execution packet.**"
 ];
 const markdown=lines.join("\n");
 const packet={
  schema:"abundent/work-launch-card-v1",
  state:"LOCAL_DRAFT_NOT_EXECUTED",
  reviewedOn:catalog.reviewedOn,
  journeyId:journey.id,
  particular:particular.trim(),
  attention,
  first,
  gate:journey.gate,
  capabilityRefs:owners.map(({id,state,openUrl,sourceUrl})=>({id,state,openUrl,sourceUrl})),
  executable:false,
  contactAuthorized:false,
  fieldConfirmed:false
 };
 return {journey,owners,first,markdown,packet};
}
