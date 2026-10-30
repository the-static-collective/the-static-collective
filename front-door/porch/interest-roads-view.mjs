import {checkCatalog,selectInterestRoads} from "./interest-roads.mjs";
// Nothing from a visitor's note is included in a URL, network request, analytics or storage.
// The only fetch is a fixed, same-origin, publicly reviewed document.
export function installInterestRoads(){
 const $=id=>document.getElementById(id);
 const status=$("interest-road-status"),experiments=$("interest-road-experiments"),questions=$("interest-road-questions");
 let sequence=0,catalogPromise=null;
 function clear(){
   sequence++;
   experiments.replaceChildren();questions.replaceChildren();
   status.textContent="No lookups performed. Related research is optional.";
 }
 function link(label,url){
   const a=document.createElement("a");a.textContent=label;a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
 }
 function line(parent,text){
   const p=document.createElement("p");p.textContent=text;parent.append(p);return p;
 }
 function draw(card,list){
   const item=document.createElement("article");item.className="road-card";
   const heading=document.createElement("h4");heading.textContent=card.title;item.append(heading);
   line(item,card.lane==="experiment"
     ?"Publicly documented experiment · "+card.state.replaceAll("_"," ").toLowerCase()
     :"Open research question · "+card.state.replaceAll("_"," ").toLowerCase()).className="road-state";
   line(item,card.summary);
   line(item,"Related by: "+card.matched.join(", ")+". This is not a verified available service or a person waiting to help.").className="road-disclaimer";
   const p=document.createElement("p");p.className="road-links";
   p.append(link(card.lane==="experiment"?"Explore this document or prototype ↗":"Inspect the open question ↗",card.openUrl));
   if(card.sourceUrl!==card.openUrl){p.append(document.createTextNode(" · "));p.append(link("Inspect source ↗",card.sourceUrl));}
   item.append(p);list.append(item);
 }
 async function readCatalog(){
   if(!catalogPromise)catalogPromise=(async()=>{
     const response=await fetch("/porch/interest-roads-v1.json",{credentials:"omit",cache:"no-store"});
     if(!response.ok)throw Error("No public catalog");
     const raw=await response.text();
     if(raw.length>70000)throw Error("Public catalog too large");
     return checkCatalog(JSON.parse(raw));
   })().catch(e=>{catalogPromise=null;throw e});
   return catalogPromise;
 }
 async function show(prepared){
   const request=++sequence;
   experiments.replaceChildren();questions.replaceChildren();
   status.textContent="Looking only at a public, dated catalog on this site. Your note is not sent for this lookup.";
   try{
     const catalog=await readCatalog();
     if(request!==sequence)return;
     const selected=selectInterestRoads(prepared,catalog);
     selected.experiments.forEach(e=>draw(e,experiments));
     selected.questions.forEach(e=>draw(e,questions));
     const count=selected.experiments.length+selected.questions.length;
     status.textContent=count
       ? "Related public research from JAR;VIS + planZ (last reviewed "+selected.reviewedOn+"). "+count+" reference"+(count===1?"":"s")+" found. None is a live match or an offer of help."
       : "No strong public research connection found. Your next-move card still works by itself. Nothing was matched or submitted.";
   }catch{
     if(request!==sequence)return;
     experiments.replaceChildren();questions.replaceChildren();
     status.textContent="Related public sources are unavailable or invalid, so no links were suggested. Your local next-move card still works.";
   }
 }
 clear();
 return {show,clear};
}
