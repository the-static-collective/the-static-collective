// HELLO-011 / The front porch's small, deterministic JAR;VIS wayfinder.
// One voluntary question. No network calls, no persistence, no profiling.
// Each destination keeps its own rules; this page does not send people's words.
const $ = (id) => document.getElementById(id);
const input = $("jarvis-question");
const form = $("jarvis-form");
const panel = $("jarvis-reply");
const intro = $("jarvis-intro");
const results = $("jarvis-doors");
const status = $("jarvis-status");
const chips = document.querySelectorAll("[data-prompt]");
const MAX=320;
const places=[
 {id:"table",url:"https://table.abundent.org/",name:"The Next Table",label:"Gather a few people",description:"Try a fictional potluck, ask one real question with permission, or find a way to gather.",terms:["table","dinner","potluck","gather","event","neighbors","neighbours","friend","together","meet","lonely","community","church","coffee","cook","meal"],reply:"A table is a decent-sized beginning. Nobody needs a committee before they can ask a neighbor a question."},
 {id:"food",url:"https://garden.abundent.org/",name:"The Garden",label:"Explore local food",description:"Look at farms, food routes, and an independent community grocery experiment. No seller or co-op enrolled by this click.",terms:["food","grocery","groceries","farm","farmers","harvest","garden","vegetable","produce","bread","milk","soup","pantry","ingredient","CSA"],reply:"Food is a practical place to begin. First find out which people actually want help and who can approve it."},
 {id:"paper",url:"https://abundent.org/paper/",name:"The Next Paper",label:"Read tomorrow's news",description:"A one-minute story about something that could happen next. The invitation at the end is real.",terms:["story","write","news","paper","newspaper","publish","reading","article","future","headline","print"],reply:"Maybe this wants to become a story people can walk into. Our newspaper runs on invitations, not predictions."},
 {id:"music",url:"https://abundent.org/jubilee/",name:"The Jubilee Circuit",label:"Start with a song",description:"Music as a way to introduce people and carry a useful invitation. It's a proposal, not an active festival partnership.",terms:["music","song","sing","band","guitar","album","festival","worship","record","rap","beat","radio","poem","dance"],reply:"Music is a fine way to get a few otherwise unrelated people into the same room."},
 {id:"warmth",url:"https://abundent.org/jubilee/wood/",name:"Winter Warmth",label:"Look at winter heat",description:"An early-stage firewood network field kit, with links to existing assistance routes. Not emergency dispatch.",terms:["cold","winter","firewood","wood","heating","heater","heat","freeze","fuel","warm","furnace"],reply:"Keeping people warm deserves practical answers. This field kit distinguishes existing help from an unbuilt network."},
 {id:"make",url:"https://firstyes.abundent.org/",name:"First Yes",label:"Find one small action",description:"Work with a question and a reversible next step. No one is enrolled or assigned work.",terms:["build","make","create","fix","repair","volunteer","help out","work","project","tool","skill","offer","give","time","test","try"],reply:"A useful thing doesn't need to be enormous. One willing person, one particular task, one honest return."},
 {id:"question",url:"https://connections.abundent.org/",name:"ask JAR;VIS!",label:"Ask the bigger question",description:"Visit the separate question machine for a fuller, interactive exploration. Decide what you type there yourself.",terms:["question","wonder","why","how","what if","curious","idea","imagine","research","weird","science","machine","computer","ai","code","technology"],reply:"That sounds like a question worth letting out of the garage. You can take it to JAR;VIS's larger workshop."},
 {id:"porch-need",url:"/porch/?kind=need",name:"The human porch",label:"Put a need into words",description:"Make a note you control. Only an explicit, separate action submits it for private review; no help is guaranteed.",terms:["need","stuck","lost","struggling","hard","difficult","can't","cannot","urgent","assistance","support","someone to","please help"],reply:"We can begin with one particular thing that would make today a bit easier. A person still has to choose whether they can respond."},
 {id:"porch-offer",url:"/porch/?kind=offer",name:"The human porch",label:"Offer something small",description:"Prepare a note about something you can offer. Sharing and accepting remain separate choices.",terms:["i can","i have","i could","i'd like to give","donate","spare","available","contribute"],reply:"What you already have might be exactly what a neighbor needs. Let's make the offer easy to understand and easy to decline."}
];
const defaults=["question","paper","table"];
const byId=Object.fromEntries(places.map(p=>[p.id,p]));
const escapeRx=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function matched(text,term){
 const t=escapeRx(term);
 return new RegExp("(^|[^a-z0-9])"+t+"(?=$|[^a-z0-9])","i").test(text);
}
export function suggest(raw){
 const q=typeof raw==="string"?raw.trim().slice(0,MAX):"";
 const lower=q.toLowerCase();
 if(!q) return {choices:defaults.map(id=>byId[id]),reason:"You can come in without a neat category. Here are three places worth wandering into.",matched:false};
 const scores=places.map((p,index)=>({p,index,hit:p.terms.filter(t=>matched(lower,t)).length}));
 const found=scores.filter(x=>x.hit>0).sort((a,b)=>b.hit-a.hit||a.index-b.index);
 const chosen=found.slice(0,3).map(x=>x.p);
 for(const id of defaults)if(chosen.length<3&&!chosen.some(p=>p.id===id))chosen.push(byId[id]);
 const primary=found[0]?.p;
 return {choices:chosen,reason:primary?primary.reply:"I haven't got a tidy box for that. Fine by me. Here's a place to start, and a better question machine if you want one.",matched:!!primary};
}
function show(raw){
 const q=raw.trim().slice(0,MAX);
 const answer=suggest(q);
 intro.textContent=answer.reason;
 results.replaceChildren();
 answer.choices.forEach((p,i)=>{
   const link=document.createElement("a");
   link.className="jarvis-route";
   link.href=p.url;
   if(p.url.startsWith("https://"))link.rel="noopener noreferrer";
   const eyebrow=document.createElement("span");eyebrow.className="route-index";eyebrow.textContent=String(i+1).padStart(2,"0")+" / "+p.name;
   const heading=document.createElement("strong");heading.textContent=p.label+" →";
   const description=document.createElement("span");description.className="route-description";description.textContent=p.description;
   link.append(eyebrow,heading,description);
   results.append(link);
 });
 status.textContent="These are suggestions, not matches or promises. Your words stayed in this browser tab; they were not sent to any tool or destination.";
 panel.hidden=false;
 panel.focus();
}
form.addEventListener("submit",event=>{
 event.preventDefault();
 const question=input.value.trim();
 if(question.length<3){status.textContent="Give me a few words, or choose a sample below.";input.focus();return}
 show(question);
});
input.addEventListener("input",()=>{panel.hidden=true;status.textContent="Nothing has been sent.";});
chips.forEach(button=>button.addEventListener("click",()=>{
 input.value=button.dataset.prompt.slice(0,MAX);
 show(input.value);
}));
$("jarvis-surprise").addEventListener("click",()=>{
 input.value="";
 show("");
});
$("jarvis-restart").addEventListener("click",()=>{panel.hidden=true;input.value="";status.textContent="Nothing has been sent.";input.focus()});
