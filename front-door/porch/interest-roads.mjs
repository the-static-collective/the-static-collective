// INTEREST-ROADS-005: source-owned documents only, never human matching.
export const ROAD_SCHEMA="abundent/interest-roads-v1";
const ignored=new Set(["community","help","local","people","person","support","care","work","group","new","start","resources","resource","service"]);
// Cross-project technical maps only surface when the visitor actually asks about that
// instrument, not merely because its source catalog mentions food, music, or a town.
const instrumentTriggers=Object.freeze({
  "ATLAS-BRIDGE-002":["atlas","ghot","compute","loadout","cannon","graft","source"],
  "BRIDGE-001":["bridge","institution","institutions","mit","rockefeller","grant"],
  "PLANZ-001":["planz","planning","plans","backlog","blocker","census"],
  "WEVES-001":["weaves","weves","commitment","receipt","review","verification"],
  "SWITCHBOARD-001":["switchboard","website","apps","directory","navigate"],
  "COMMUTER-001":["commuter","integration","sync","grownby","email","crm","automation","newsletter"],
  "SUITCASE-001":["suitcase","offline","campus","university","mobile","node"]
});
const aliases=new Map([
  ["bread","food"],["loaf","food"],["loaves","food"],["vegetable","food"],
  ["vegetables","food"],["produce","food"],["groceries","food"],
  ["pantry","food"],["meals","food"],["meal","food"],
  ["printer","print"],["printed","print"],["printing","print"],
  ["repairs","repair"],["volunteers","volunteer"],["farmers","farm"]
]);
function normalize(s){
  return s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
function tokens(s){
  const t=new Set(normalize(s).split(/\s+/u).filter(x=>x.length>1));
  for(const word of [...t])if(aliases.has(word))t.add(aliases.get(word));
  return t;
}
const isWebURL=(s)=>{try{const u=new URL(s);return u.protocol==="https:"&&u.username===""&&u.password===""}catch{return false}};
export function checkCatalog(catalog){
 if(!catalog||catalog.schema!==ROAD_SCHEMA||!Array.isArray(catalog.entries)||catalog.entries.length<1||catalog.entries.length>100)throw new Error("Public research catalog unavailable.");
 if(!Array.isArray(catalog.sources)||catalog.sources.length!==2)throw new Error("Source lineage missing.");
 for(const source of catalog.sources){
   if(!/^the-static-collective\/(JAR-VIS|planZ)$/.test(source.owner)||!(/^[a-f0-9]{40}$/).test(source.gitBlobSha)||!(/^\d{4}-\d{2}-\d{2}$/).test(source.reviewedOn))throw new Error("Source lineage invalid.");
 }
 const ids=new Set();
 for(const e of catalog.entries){
   const key=e.lane+":"+e.id;
   if(ids.has(key)||!["experiment","question"].includes(e.lane)||typeof e.id!=="string"||!(/^[A-Z0-9-]{3,80}$/).test(e.id)||typeof e.title!=="string"||e.title.length>160||typeof e.summary!=="string"||e.summary.length>750||typeof e.state!=="string"||e.state.length>90||!Array.isArray(e.tags)||e.tags.length>40||!e.tags.every(t=>typeof t==="string"&&t.length<=40)||!isWebURL(e.openUrl)||!isWebURL(e.sourceUrl))throw new Error("Public research entry invalid.");
   if(e.lane==="question"&&(e.executionAllowed!==false||e.fieldOutcome!=="NOT_VERIFIED"||e.thirdPartyApproval!=="NOT_ESTABLISHED"))throw new Error("Question cannot imply authority.");
   ids.add(key);
 }
 return catalog;
}
export function selectInterestRoads(prepared,catalog,{maxExperiments=3,maxQuestions=1}={}){
 checkCatalog(catalog);
 if(!prepared||!["need","offer","question"].includes(prepared.kind)||typeof prepared.particular!=="string"||prepared.particular.length<8||prepared.particular.length>420)throw new Error("Make a porch note first.");
 // Only voluntary topical text, never area, contact information, browser location, identity, or backend lookup.
 const q=tokens(prepared.particular+" "+(typeof prepared.next==="string"?prepared.next.slice(0,220):""));
 const scored=[];
 for(const [index,e] of catalog.entries.entries()){
   const matched=e.tags.filter(t=>{
     const a=normalize(t).split(/\s+/u).filter(Boolean);
     return a.length>0&&!a.every(w=>ignored.has(w))&&a.every(w=>q.has(w));
   });
   if(!matched.length)continue;
   const triggers=instrumentTriggers[e.id];
   if(triggers && !matched.some(t=>triggers.includes(normalize(t))))continue;
   const score=matched.reduce((n,t)=>n+(normalize(t).includes(" ")?5:2),0);
   scored.push({...e,matched:matched.slice(0,3),score,index});
 }
 // Ties preserve the source author's editorial ordering rather than arbitrary alphabetic wins.
 scored.sort((a,b)=>b.score-a.score||a.index-b.index);
 const experiments=scored.filter(x=>x.lane==="experiment").slice(0,Math.max(0,Math.min(5,maxExperiments)));
 const questions=scored.filter(x=>x.lane==="question").slice(0,Math.max(0,Math.min(2,maxQuestions)));
 return {experiments,questions,reviewedOn:catalog.sources.map(x=>x.reviewedOn).sort()[0],sourceEditions:catalog.sources.map(x=>x.edition)};
}
