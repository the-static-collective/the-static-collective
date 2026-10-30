import {prepare,mailto} from "./engine.mjs";
import {installPrivateReceiver} from "./private-inbox.mjs";
const $=id=>document.getElementById(id);
const form=$("porch-form");let current=null,objectUrl=null;
const entryKind=new URL(location.href).searchParams.get("kind");
if(Object.prototype.hasOwnProperty.call({need:1,offer:1,question:1},entryKind)){
 const selected=[...form.querySelectorAll('input[name="kind"]')].find(el=>el.value===entryKind);if(selected)selected.checked=true;
}
const text={need:["What would help?","A simple sentence is enough. For example: “I'd like someone to help me figure out where to start.”"],offer:["What could you share?","A skill, a spare thing, a little time, or something you've learned."],question:["What did you notice?","A question, an overlooked problem, or an idea worth asking somebody about."]};
function resetOutput(){current=null;$("result").hidden=true;$("note-preview").textContent="";$("email-note").href="mailto:us@abundent.org?subject=Hello%20from%20the%20porch";}
function updateIntent(){const kind=form.elements.kind.value;$("what-label").textContent=text[kind][0];$("what-help").textContent=text[kind][1]}
form.querySelectorAll("input[name=kind]").forEach(r=>r.addEventListener("change",()=>{updateIntent();resetOutput()}));
for(const element of form.querySelectorAll("textarea,input,select"))element.addEventListener("input",()=>{resetOutput();$("form-status").textContent="Editing locally. Nothing is sent.";if(element.id==="particular")$("particular-count").textContent=element.value.length+" / 420"});
form.addEventListener("reset",()=>{resetOutput();queueMicrotask(()=>{$("particular-count").textContent="0 / 420";updateIntent();$("form-status").textContent="Cleared from the form. Nothing was sent."})});
form.addEventListener("submit",event=>{
 event.preventDefault();
 try{
  const data={kind:form.elements.kind.value,particular:$("particular").value,area:$("area").value,when:$("when").value,next:$("next").value};
  current=prepare(data);$("note-preview").textContent=current.note;$("email-note").href=mailto(current);$("result").hidden=false;
  $("form-status").textContent="Note ready below. Not sent or posted.";$("result-status").textContent="This is your note to copy, save, or open in your email app. Nothing has been sent.";
  $("result").focus();
 }catch(error){resetOutput();$("form-status").textContent=error.message;$("particular").focus();}
});
$("copy-note").addEventListener("click",async()=>{
 if(!current)return;
 try{await navigator.clipboard.writeText(current.note);$("result-status").textContent="Copied to your clipboard. You still decide where to share it.";}
 catch{$("result-status").textContent="Clipboard unavailable. Select and copy the note above instead.";}
});
$("save-note").addEventListener("click",()=>{
 if(!current)return;
 try{if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(new Blob([current.note+"\n"],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=objectUrl;a.download="abundent-small-note.txt";a.click();$("result-status").textContent="Text-file download requested. No message sent.";setTimeout(()=>{if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}},5000)}
 catch{$("result-status").textContent="Download unavailable. Copy the note above instead.";}
});
$("email-note").addEventListener("click",()=>{$("result-status").textContent="Your email app may open a draft. Nothing is sent until you press Send there.";});

updateIntent();

installPrivateReceiver({getPrepared:()=>current});
