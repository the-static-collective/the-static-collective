import {prepare} from "../porch/engine.mjs";
const samples=Object.freeze({
 food:{kind:"need",particular:"Could somebody help bring a few boxes of garden produce to the community table?",area:"Made-up town",when:"Whenever works",next:"Find out which time and place work for someone willing."},
 ride:{kind:"offer",particular:"I could give another adult a ride to a fictional neighborhood meeting.",area:"Made-up town",when:"Soon, if possible",next:"First ask whether the person needs that kind of help."},
 question:{kind:"question",particular:"How might neighbors start a shared table for leftover materials and useful ideas?",area:"Made-up town",when:"Just exploring",next:"Ask what one modest experiment people would actually want to try."}
});
const $=id=>document.getElementById(id);
function plan(d){
 const x=d.particular.toLowerCase();
 if(/garden|produce|boxes/.test(x))return "Possible area: food and growing. A human should check actual time, location and willingness first.";
 if(/ride|meeting/.test(x))return "Possible area: transport and logistics. A human must check needs, consent and safety first.";
 return "Possible area: gathering. A human could suggest a smaller question before inviting anyone.";
}
$("demo-run").addEventListener("click",()=>{
 const d=samples[$("example").value]||samples.food;
 const x=prepare(d);
 $("demo-kind").textContent=d.kind.toUpperCase()+" · SYNTHETIC EXAMPLE";
 $("demo-note").textContent=x.note;
 $("demo-suggestion").textContent="JAR;VIS attention: "+plan(x);
 $("demo-status").textContent="All in this browser. No outside effects.";
 $("demo-result").hidden=false;$("demo-result").focus();
});
$("demo-copy").addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText($("demo-note").textContent);$("demo-status").textContent="Fictional example copied."}catch{$("demo-status").textContent="Select the example text to copy it."}
});
