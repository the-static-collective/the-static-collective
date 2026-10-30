import test from "node:test";
import assert from "node:assert/strict";
import {makeReturnCard} from "./return-card.mjs";
import {makeNextMove} from "./next-move.mjs";
const prepared={kind:"offer",particular:"I could share some garden tools.",when:"Whenever works"};
const plan=makeNextMove(prepared,{attention:"glance"});
test("return card names subjective report, never verified work",()=>{
 const x=makeReturnCard({status:"DONE_REPORTED",whatChanged:"I put the idea to my neighbor."},prepared,plan);
 assert.match(x.text,/self-attested · not sent/);
 assert.match(x.text,/not a verified work receipt/);
 assert.match(x.text,/I put the idea to my neighbor/);
 assert.match(x.text,/garden tools/);
 assert.equal(x.attention,"glance");
});
test("refusal and uncertainty are first-class return paths",()=>{
 for(const status of ["NOT_YET","DECLINED","UNKNOWN"]){
  const x=makeReturnCard({status},prepared,plan);
  assert.equal(x.status,status);
  assert.match(x.text,/not independently confirmed/);
 }
});
test("bad status, excessive details and missing note are refused",()=>{
 assert.throws(()=>makeReturnCard({status:"VERIFIED"},prepared,plan),/honest outcome/);
 assert.throws(()=>makeReturnCard({status:"UNKNOWN",whatChanged:"x".repeat(221)},prepared,plan),/many characters/);
 assert.throws(()=>makeReturnCard({status:"UNKNOWN"},null,plan),/next move/);
});
test("preparing the return never mutates the original note or plan",()=>{
 const before=JSON.stringify({prepared,plan});
 makeReturnCard({status:"DECLINED"},prepared,plan);
 assert.equal(JSON.stringify({prepared,plan}),before);
});
