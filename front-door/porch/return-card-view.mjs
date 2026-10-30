import {makeReturnCard} from "./return-card.mjs";
export function installReturnCard({getPrepared,getPlan}){
 const $=id=>document.getElementById(id);
 const root=$("personal-return"),result=$("return-result"),preview=$("return-preview");
 const status=$("return-status-message"),details=$("return-what-changed");
 const options=[...root.querySelectorAll('input[name="return-status"]')];
 let current=null,objectUrl=null;
 function clear(){
   current=null;result.hidden=true;preview.textContent="";
   status.textContent="Not prepared. No note has been sent.";
   details.value="";const unknown=options.find(x=>x.value==="UNKNOWN");if(unknown)unknown.checked=true;
   if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}
 }
 function invalidate(){
   current=null;result.hidden=true;preview.textContent="";
   status.textContent="Changes stay here until you choose to make a new return note.";
 }
 details.addEventListener("input",invalidate);
 for(const option of options)option.addEventListener("change",invalidate);
 $("make-return-card").addEventListener("click",()=>{
   try{
     const selected=options.find(x=>x.checked)?.value;
     current=makeReturnCard({status:selected,whatChanged:details.value},getPrepared(),getPlan());
     preview.textContent=current.text;result.hidden=false;
     status.textContent="Your own return note is ready. Self-attested only. Not sent or independently checked.";
   }catch(e){current=null;result.hidden=true;status.textContent=e.message}
 });
 $("copy-return").addEventListener("click",async()=>{
   if(!current)return;
   try{await navigator.clipboard.writeText(current.text);status.textContent="Copied. You choose whether to share it."}
   catch{status.textContent="Clipboard unavailable. Select the text above and copy it instead."}
 });
 $("save-return").addEventListener("click",()=>{
   if(!current)return;
   try{
     if(objectUrl)URL.revokeObjectURL(objectUrl);
     objectUrl=URL.createObjectURL(new Blob([current.text+"\n"],{type:"text/plain;charset=utf-8"}));
     const a=document.createElement("a");a.href=objectUrl;a.download="abundent-personal-return.txt";a.click();
     status.textContent="A local text-file download was requested. Nothing was sent.";
     setTimeout(()=>{if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}},5000);
   }catch{status.textContent="Download unavailable. Copy the return above instead."}
 });
 clear();
 return {clear,ready:()=>{status.textContent="Optional: return later with a truthful personal update. Nothing is sent.";},invalidate};
}
