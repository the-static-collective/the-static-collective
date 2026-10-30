import {clean} from "./engine.mjs";
// A local self-attested reflection, NOT a reLATTE receipt, proof of service or verified WE'VE.
const statuses=Object.freeze({
  DONE_REPORTED:"I report that I tried this and made progress",
  NOT_YET:"I have not tried this yet",
  DECLINED:"I decided not to do this",
  UNKNOWN:"I am not sure what happened"
});
export function makeReturnCard({status,whatChanged=""},prepared,plan){
 if(!Object.hasOwn(statuses,status))throw Error("Choose an honest outcome.");
 if(!prepared||!["need","offer","question"].includes(prepared.kind)||typeof prepared.particular!=="string"||!plan||typeof plan.first!=="string"||typeof plan.attention!=="string")throw Error("Make a next move first.");
 const note=clean(whatChanged,220),particular=clean(prepared.particular,420),first=clean(plan.first,600);
 if(particular.length<8)throw Error("Make a real porch note first.");
 const lines=[
   "ABUNDENT / MY OWN RETURN NOTE",
   "Local · self-attested · not sent · not independently confirmed",
   "",
   "WHAT WAS ON MY MIND",
   particular,
   "",
   "THE SMALL STEP I CONSIDERED",
   first,
   "",
   "WHAT I CAN PERSONALLY REPORT",
   statuses[status]
 ];
 if(note)lines.push("","What I noticed: "+note);
 lines.push("","—",
 "This is my own recollection, not a verified work receipt, recipient confirmation, independent review or authorization to publish.",
 "Copying or saving does not send it anywhere. I choose whether, when and with whom to share it.");
 return Object.freeze({status,kind:prepared.kind,attention:plan.attention,text:lines.join("\n")});
}
