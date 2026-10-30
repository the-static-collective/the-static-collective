// Abundent 010 / feedback: one visible, private way to say the page is broken.
// Uses the same explicitly consented receiver as the human porch. No auto capture,
// tracking, cookies, screen recordings, or unsolicited browser error collection.
const API="https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/porch-receiver-009";
const el=(tag,cls="",value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x};
const errorText=reason=>({
  TRY_AGAIN_LATER:"The inbox is busy. You can still email us.",
  PUBLIC_SAFE_TEXT_REQUIRED:"Please remove email addresses, phone numbers, street addresses, URLs, or private information.",
  RECEIVER_UNAVAILABLE:"We couldn't confirm the report was received. Please use email instead."
})[reason]||"The report could not be received right now. You can use email instead.";
const clip=async text=>{try{await navigator.clipboard.writeText(text);return true}catch{return false}};
export function installFeedback(){
 if(document.getElementById("abundent-feedback-button"))return;
 const button=el("button","ab-feedback-button","Something broken?");
 button.id="abundent-feedback-button";button.type="button";button.setAttribute("aria-haspopup","dialog");
 const dialog=el("dialog","ab-feedback-dialog");dialog.setAttribute("aria-labelledby","ab-feedback-title");
 const frame=el("div","ab-feedback-frame");
 const heading=el("h2","","Tell us what's not working.");heading.id="ab-feedback-title";
 const description=el("p","","A missing button, an unclear page, a silly bug? We want to know. No login.");
 const warning=el("p","ab-feedback-warning","Please don't include contact details, exact addresses, private stories or sensitive information. This goes to a private review queue, not a public wall.");
 const form=el("form");form.method="dialog";form.noValidate=true;
 const typeLabel=el("label","","What's going on?");typeLabel.htmlFor="ab-feedback-kind";
 const type=el("select");type.id="ab-feedback-kind";type.name="category";
 for(const [value,label] of [["broken","Something's broken"],["confusing","I'm confused"],["idea","I have a suggestion"]]){const option=el("option","",label);option.value=value;type.append(option)}
 const inputLabel=el("label","","What happened?");inputLabel.htmlFor="ab-feedback-text";
 const field=el("textarea");field.id="ab-feedback-text";field.name="detail";field.rows=4;field.minLength=8;field.maxLength=300;field.placeholder="I tried to…, but then…";field.required=true;
 const count=el("small","ab-feedback-counter","0 / 300");
 field.addEventListener("input",()=>count.textContent=field.value.length+" / 300");
 const consentLabel=el("label","ab-feedback-consent");const consent=el("input");consent.type="checkbox";consent.required=true;
 consentLabel.append(consent,document.createTextNode(" Send this report privately to Abundent for review. I know a response isn't guaranteed."));
 const status=el("p","ab-feedback-status","Not sent.");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const actions=el("div","ab-feedback-actions");
 const send=el("button","ab-feedback-send","Send report");send.type="submit";send.value="submit";
 const close=el("button","ab-feedback-close","Close");close.type="button";
 const email=el("a","ab-feedback-email","Use email instead ↗");email.href="mailto:us@abundent.org?subject=Website%20feedback";
 actions.append(send,close,email);
 const receipt=el("div","ab-feedback-receipt");receipt.hidden=true;receipt.setAttribute("aria-live","polite");
 const receiptHeading=el("strong","","Received. Save your private receipt.");
 const receiptNote=el("p","","It lets you check for a response or withdraw your report later. Anyone with this key can access its status; keep it private.");
 const receiptKey=el("textarea");receiptKey.readOnly=true;receiptKey.rows=3;receiptKey.setAttribute("aria-label","Private receipt and key");receiptKey.autocomplete="off";
 const copy=el("button","ab-feedback-close","Copy receipt");copy.type="button";
 receipt.append(receiptHeading,receiptNote,receiptKey,copy);
 form.append(typeLabel,type,inputLabel,field,count,consentLabel,actions,status,receipt);
 frame.append(heading,description,warning,form);dialog.append(frame);document.body.append(button,dialog);
 const open=()=>{if(typeof dialog.showModal==="function")dialog.showModal();else{dialog.setAttribute("open","");dialog.setAttribute("aria-modal","true")}field.focus()};
 const dismiss=()=>{if(typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open");button.focus()};
 button.addEventListener("click",open);close.addEventListener("click",dismiss);
 dialog.addEventListener("click",e=>{if(e.target===dialog)dismiss()});
 let busy=false;
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(busy)return;
  const text=field.value.trim().replace(/\s+/g," ");
  if(text.length<8||text.length>300){status.textContent="Tell us what happened in 8–300 characters.";field.focus();return}
  if(!consent.checked){status.textContent="Check the consent box to send this privately.";return}
  busy=true;send.disabled=true;status.textContent="Sending report…";
  const segment=location.pathname.replace(/[^a-zA-Z0-9/_-]/g,"").slice(0,62)||"/";
  const particular="Website feedback ("+type.value+"): "+text;
  try{
   const res=await fetch(API,{method:"POST",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",redirect:"error",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"submit",kind:"question",particular,area:"Website "+segment,when:"Just exploring",next:"Please review this website report.",consent:true,website:""})});
   let data;try{data=await res.json()}catch{throw Error("RECEIVER_UNAVAILABLE")}
   if(!res.ok)throw Error(data.error||"RECEIVER_UNAVAILABLE");
   if(!data.receiptId||!data.receiptKey)throw Error("RECEIVER_UNAVAILABLE");
   const words="ABUNDENT WEBSITE REPORT RECEIPT\nID: "+data.receiptId+"\nKey: "+data.receiptKey+"\nCheck or withdraw at: https://hello.abundent.org/porch/\nExpires: "+data.expiresAt;
   receiptKey.value=words;receipt.hidden=false;
   field.value="";count.textContent="0 / 300";consent.checked=false;
   status.textContent="Received privately. Nothing was published or assigned. Save your receipt.";
   copy.onclick=async()=>status.textContent=await clip(words)?"Private receipt copied. Keep it safe.":"Select the receipt text and copy it manually.";
  }catch(err){status.textContent=errorText(err.message)}
  finally{busy=false;send.disabled=false}
 });
}
installFeedback();
