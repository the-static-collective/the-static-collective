// HELLO-011 / Interface for the rules-only JAR;VIS porch guide.
// One voluntary question. No network calls, no persistence, no profiling.
// Each destination keeps its own rules; this page does not send people's words.
const $ = (id) => document.getElementById(id);
const input = $("jarvis-question");
const form = $("jarvis-form");
const panel = $("jarvis-reply");
const intro = $("jarvis-intro");
const results = $("jarvis-doors");
const status = $("jarvis-status");
const promptStatus = $("jarvis-prompt-status");
const chips = document.querySelectorAll("[data-prompt]");
import {suggest} from "./routes.mjs";
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
 promptStatus.textContent="Local route prepared. Nothing sent.";
 status.textContent="These are suggestions, not matches or promises. Your words stayed in this browser tab; they were not sent to any tool or destination.";
 panel.hidden=false;
 panel.focus();
}
form.addEventListener("submit",event=>{
 event.preventDefault();
 const question=input.value.trim();
 if(question.length<3){promptStatus.textContent="Give me a few words, or choose a sample below.";input.focus();return}
 show(question);
});
input.addEventListener("input",()=>{panel.hidden=true;promptStatus.textContent="Nothing has been sent.";});
chips.forEach(button=>button.addEventListener("click",()=>{
 input.value=button.dataset.prompt.slice(0,MAX);
 show(input.value);
}));
$("jarvis-surprise").addEventListener("click",()=>{
 input.value="";
 show("");
});
$("jarvis-restart").addEventListener("click",()=>{panel.hidden=true;input.value="";promptStatus.textContent="Nothing has been sent.";input.focus()});
