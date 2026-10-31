const labels=Object.freeze({need:"I could use a hand",offer:"I have something to offer",question:"I noticed something"});
const subjects=Object.freeze({need:"Need",offer:"Offer",question:"Question"});
export function clean(value,max){if(typeof value!=="string")throw new Error("Invalid text");const s=value.replace(/\r\n?/g,"\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim();if(s.length>max)throw new Error("Too many characters");return s}
export function prepare(data){
 if(!Object.prototype.hasOwnProperty.call(labels,data.kind))throw new Error("Pick why you're here.");
 const particular=clean(data.particular,420),area=clean(data.area||"",90),next=clean(data.next||"",220);
 if(particular.length<8)throw new Error("Tell us one small thing in at least eight characters.");
 if(!["Whenever works","Soon, if possible","Just exploring"].includes(data.when))throw new Error("Choose a timeframe.");
 const lines=["ABUNDENT · ONE SMALL NOTE",labels[data.kind],"",particular];
 if(area)lines.push("","Around: "+area);
 lines.push("","When: "+data.when);
 if(next)lines.push("","A useful first step: "+next);
 lines.push("","—","Prepared here, not sent or publicly posted.","Sharing, accepting, and following through are separate human choices.");
 return {kind:data.kind,note:lines.join("\n"),particular,area,next,when:data.when}
}
export function mailto(prepared){
 const title=subjects[prepared.kind]+" · "+prepared.particular.replace(/\s+/g," ").slice(0,48);
 return "mailto:us@abundent.org?subject="+encodeURIComponent("Abundent porch: "+title)+"&body="+encodeURIComponent(prepared.note+"\n\nIf you choose to reply, please say what you can and cannot offer. No automatic assignment is assumed.");
}
