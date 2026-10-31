// Human Porch 002 → JAR;VIS Receiver 009. No automatic network calls.
const API="https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/porch-receiver-009";
const $=id=>document.getElementById(id);
const codeToText={
 "PUBLIC_SAFE_TEXT_REQUIRED":"Please remove contact details, exact addresses, URLs or sensitive information. Keep the note short.",
 "TRY_AGAIN_LATER":"We've reached our intake limit. You can still copy, save, or email your note.",
 "RECEIVER_UNAVAILABLE":"Private intake is unavailable. Your note has not been confirmed received. You can still copy or save it.",
 "NOT_FOUND_OR_EXPIRED":"That receipt is unknown, withdrawn, or expired.",
 "INVALID_RECEIPT":"Check your receipt ID and private key.",
 "ORIGIN_NOT_ALLOWED":"Private intake isn't available from this page."
};
function explain(reason){return codeToText[reason]||("Request was not completed ("+String(reason||"UNAVAILABLE").replace(/[^A-Z0-9_]/g,"").slice(0,32)+").")}
async function command(body){
 const res=await fetch(API,{method:"POST",credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 let data;try{data=await res.json()}catch{throw Error("RECEIVER_UNAVAILABLE")}
 if(!res.ok)throw Error(data.error||"RECEIVER_UNAVAILABLE");
 return data;
}
function download(name,content){
 const url=URL.createObjectURL(new Blob([content],{type:"text/plain;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function installPrivateReceiver({getPrepared}){
 const consent=$("private-consent"),submit=$("send-private"),note=$("private-status"),receiptPanel=$("receipt-panel"),lookup=$("lookup-status"),reply=$("lookup-reply");
 let savedReceipt=null,busy=false;
 const enable=()=>{submit.disabled=!consent.checked||!getPrepared()||busy;};
 consent.addEventListener("change",enable);
 const form=$("porch-form");
 // Any changed composition is a new decision, never inherited consent.
 form.addEventListener("input",()=>{consent.checked=false;enable()});
 form.addEventListener("reset",()=>{consent.checked=false;enable()});
 submit.addEventListener("click",async()=>{
  const x=getPrepared();
  if(!x||!consent.checked||busy)return;
  busy=true;enable();note.textContent="Sending a private note for review…";
  try{
   const data=await command({action:"submit",kind:x.kind,particular:x.particular,area:x.area,when:x.when,next:x.next,consent:true,website:""});
   if(!data.receiptId||!data.receiptKey)throw Error("RECEIVER_UNAVAILABLE");
   savedReceipt={id:data.receiptId,key:data.receiptKey,at:data.createdAt,expires:data.expiresAt};
   $("receipt-id").value=savedReceipt.id;$("receipt-key").value=savedReceipt.key;
   $("lookup-id").value=savedReceipt.id;$("lookup-key").value=savedReceipt.key;
   receiptPanel.hidden=false;
   consent.checked=false;note.textContent="RECEIVED · Private review pending. Your note is not public and nobody has been assigned. Save the receipt below.";
   receiptPanel.scrollIntoView({behavior:"auto",block:"nearest"});
  }catch(e){note.textContent=explain(e.message)+" If your connection dropped, don't resend until you check whether a receipt was returned."}
  finally{busy=false;enable()}
 });
 $("copy-receipt").addEventListener("click",async()=>{
  if(!savedReceipt)return;
  try{await navigator.clipboard.writeText("ABUNDENT PRIVATE PORCH RECEIPT\nID: "+savedReceipt.id+"\nKey: "+savedReceipt.key+"\nExpires: "+savedReceipt.expires+"\nCheck at: https://hello.abundent.org/porch/\n");note.textContent="Receipt copied. Keep it somewhere private."}
  catch{note.textContent="Clipboard unavailable. Select the receipt values and copy manually."}
 });
 $("save-receipt").addEventListener("click",()=>{
  if(!savedReceipt)return;
  download("abundent-private-receipt.txt","ABUNDENT PRIVATE PORCH RECEIPT\nID: "+savedReceipt.id+"\nKey: "+savedReceipt.key+"\nExpires: "+savedReceipt.expires+"\nCheck: https://hello.abundent.org/porch/\n\nDo not publish the key. Nobody can recover it for you.\n");
  note.textContent="Receipt file download requested. Keep it private.";
 });
 let checking=false;
 async function withReceipt(action){
  if(checking)return;
  const receiptId=$("lookup-id").value.trim(),receiptKey=$("lookup-key").value.trim();
  if(!receiptId||!receiptKey){lookup.textContent="Enter both receipt ID and private key.";return}
  if(action==="withdraw"&&!confirm("Delete this stored note? This cannot undo any copies you shared outside Abundent."))return;
  checking=true;$("check-receipt").disabled=true;$("withdraw-receipt").disabled=true;
  lookup.textContent=action==="withdraw"?"Requesting withdrawal…":"Checking the private queue…";reply.hidden=true;reply.textContent="";
  try{
   const result=await command({action,receiptId,receiptKey});
   if(action==="withdraw"){
    lookup.textContent="WITHDRAWN · This private note has been deleted.";
    $("lookup-key").value="";
    if(savedReceipt?.id===receiptId){savedReceipt=null;receiptPanel.hidden=true}
   }else{
    const state=result.state;
    const labels={PENDING:"PENDING · We received the note. A human has not reviewed it yet.",HELD:"HELD · Someone reviewed it, but no answer is ready.",REPLY_AVAILABLE:"REPLY AVAILABLE · An operator left you a note. This is not a verified match.",CLOSED:"CLOSED · No further action is planned."};
    lookup.textContent=labels[state]||"Status: "+String(state||"unknown");
    if(state==="REPLY_AVAILABLE"&&result.reply){reply.textContent=result.reply;reply.hidden=false}
   }
  }catch(e){lookup.textContent=explain(e.message)}
  finally{checking=false;$("check-receipt").disabled=false;$("withdraw-receipt").disabled=false}
 }
 $("check-receipt").addEventListener("click",()=>withReceipt("status"));
 $("withdraw-receipt").addEventListener("click",()=>withReceipt("withdraw"));
}
