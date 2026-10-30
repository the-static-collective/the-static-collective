import {checkRoutes,makeWorkLaunch} from "./router.mjs";
import {checkCatalog,selectInterestRoads} from "../porch/interest-roads.mjs";
const $=id=>document.getElementById(id);
const form=$("work-form"),choices=$("job-choices"),status=$("work-status"),output=$("work-output");
let registry=null,current=null,lastURL=null,researchIndexPromise=null,seq=0;
const stateBanner="This is a proposed route to source-owned tools, not an automation run or a grant submission.";
const link=(title,href)=>{
 const a=document.createElement("a");a.textContent=title;a.href=href;
 if(href.startsWith("https://")){a.target="_blank";a.rel="noopener noreferrer"}
 return a;
};
function line(parent,txt,cls){
 const p=document.createElement("p");p.textContent=txt;if(cls)p.className=cls;parent.append(p);return p;
}
function invalidate(){
 current=null;seq++;output.hidden=true;$("work-owners").replaceChildren();$("work-research-results").replaceChildren();
 $("work-research-status").textContent="Research not requested.";
 status.textContent="Editing locally. Nothing sent, stored or run.";
}
function drawOwner(holder,c,kind="owner"){
 const card=document.createElement("article");card.className="work-owner";
 const h=document.createElement("h4");h.textContent=c.label||c.title;card.append(h);
 line(card,kind==="research"?c.state.replaceAll("_"," "):c.statusText,"state");
 line(card,kind==="research"?c.summary:c.boundary);
 const links=document.createElement("p");links.append(link("Open "+(kind==="research"?"document":"source-owned door")+" ↗",c.openUrl));
 if(c.openUrl!==c.sourceUrl){links.append(document.createTextNode(" · "));const sl=link("Inspect evidence ↗",c.sourceUrl);sl.className="source-link";links.append(sl)}
 card.append(links);holder.append(card);
}
async function readRegistry(){
 const response=await fetch("/work/routes-v1.json",{credentials:"omit",cache:"no-store"});
 if(!response.ok)throw Error("Cannot read source-owned tool registry.");
 const raw=await response.text();
 if(raw.length>42000)throw Error("Tool registry is oversized.");
 return checkRoutes(JSON.parse(raw));
}
async function init(){
 try{
  registry=await readRegistry();
  const fragment=document.createDocumentFragment();
  for(const [i,j] of registry.journeys.entries()){
   const label=document.createElement("label");label.className="work-choice";
   const radio=document.createElement("input");radio.type="radio";radio.name="journey";radio.value=j.id;radio.required=true;
   if(i===0)radio.checked=true;
   const title=document.createElement("strong");title.textContent=j.label;
   const sub=document.createElement("small");sub.textContent=j.need;
   label.append(radio,title,sub);fragment.append(label);
  }
  choices.replaceChildren(fragment);
  choices.querySelectorAll("input").forEach(r=>r.addEventListener("change",()=>{
   invalidate();
   const j=registry.journeys.find(x=>x.id===r.value);
   if(j)$("particular").placeholder=j.cue;
  }));
  $("particular").placeholder=registry.journeys[0].cue;
  status.textContent="Eight possible jobs. Each route preserves its original sources and approval gates.";
 }catch{
  status.textContent="The reviewed route registry couldn't be loaded. No tool recommendations were invented. The regular Porch still works.";
  $("make-work").disabled=true;
 }
}
form.addEventListener("input",invalidate);
form.addEventListener("submit",event=>{
 event.preventDefault();
 try{
  const journeyId=form.querySelector('input[name="journey"]:checked')?.value;
  const attention=form.querySelector('input[name="attention"]:checked')?.value||"few";
  current=makeWorkLaunch({journeyId,particular:$("particular").value,attention},registry);
  $("work-first").textContent=current.first;
  $("work-gate").textContent="Permission/field gate: "+current.journey.gate;
  const holder=$("work-owners");holder.replaceChildren();
  current.owners.forEach(x=>drawOwner(holder,x));
  output.hidden=false;
  status.textContent=stateBanner;
  $("work-export-status").textContent="Nothing sent or executed. Every link is your choice.";
  $("work-research-status").textContent="Research not requested.";
  $("work-research-results").replaceChildren();
  output.focus();
 }catch(e){invalidate();status.textContent=e.message}
});
form.addEventListener("reset",()=>{
 queueMicrotask(()=>{
  invalidate();const first=choices.querySelector("input");if(first)first.checked=true;
  const radio=form.querySelector('input[name="attention"][value="few"]');if(radio)radio.checked=true;
  $("particular").placeholder=registry?.journeys[0]?.cue||"One specific task…";
  status.textContent="Cleared. Nothing has been sent.";
 })
});
$("particular").addEventListener("input",invalidate);
async function copyText(txt){
 try{await navigator.clipboard.writeText(txt);$("work-export-status").textContent="Copied to clipboard. No source system was contacted."}
 catch{$("work-export-status").textContent="Clipboard unavailable. Use Save or select the browser text instead."}
}
function download(name,content,mime){
 try{
  if(lastURL)URL.revokeObjectURL(lastURL);
  lastURL=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement("a");a.href=lastURL;a.download=name;a.click();
  $("work-export-status").textContent="Local download requested. Nothing was submitted or executed.";
  const captured=lastURL;setTimeout(()=>{URL.revokeObjectURL(captured);if(lastURL===captured)lastURL=null},5000);
 }catch{$("work-export-status").textContent="Download unavailable. Copy the text instead."}
}
$("copy-work").addEventListener("click",()=>{if(current)copyText(current.markdown)});
$("save-markdown").addEventListener("click",()=>{if(current)download("abundent-work-brief.md",current.markdown+"\n","text/markdown;charset=utf-8")});
$("save-json").addEventListener("click",()=>{if(current)download("abundent-proposed-work.json",JSON.stringify(current.packet,null,2)+"\n","application/json")});
$("find-research").addEventListener("click",async()=>{
 if(!current)return;
 const ticket=++seq;
 const result=$("work-research-results"),msg=$("work-research-status");result.replaceChildren();
 msg.textContent="Reading the dated public snapshot from this website. Your words are not sent.";
 try{
  if(!researchIndexPromise)researchIndexPromise=(async()=>{
    const response=await fetch("/porch/interest-roads-v1.json",{credentials:"omit",cache:"no-store"});
    if(!response.ok)throw Error("No research index");
    const raw=await response.text();if(raw.length>70000)throw Error("Invalid index");
    return checkCatalog(JSON.parse(raw));
  })().catch(e=>{researchIndexPromise=null;throw e});
  const catalog=await researchIndexPromise;if(ticket!==seq||!current)return;
  const research=selectInterestRoads({kind:"question",particular:current.packet.particular},catalog,{maxExperiments:2,maxQuestions:1});
  const matches=[...research.experiments,...research.questions];
  matches.forEach(c=>drawOwner(result,c,"research"));
  msg.textContent=matches.length?matches.length+" public research reference(s), not people, matches, or available services.":"No relevant reviewed source found. The local work card remains useful.";
 }catch{if(ticket===seq)msg.textContent="The public research index was unavailable or invalid; no references were made up."}
});
init();
