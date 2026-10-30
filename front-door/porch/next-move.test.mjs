import test from "node:test";
import assert from "node:assert/strict";
import {makeNextMove} from "./next-move.mjs";
const base={kind:"need",particular:"I need help with a community garden."};
test("food need produces a bounded action, not a match",()=>{
 const p=makeNextMove(base);
 assert.equal(p.topic,"food and growing");
 assert.match(p.text,/not sent · not a match/);
 assert.match(p.text,/DONE, NOT YET, DECLINED, or UNKNOWN/);
 assert.match(p.text,/safe handling/);
});
test("offer is distinct from need",()=>{
 const p=makeNextMove({kind:"offer",particular:"I can offer to fix a neighbor's old bicycle."});
 assert.equal(p.topic,"fixing and tools");
 assert.match(p.text,/explicitly accepts, declines, or changes/);
});
test("a visitor's own next step stays optional and local",()=>{
 const p=makeNextMove({...base,next:"Ask whether somebody can bring a watering can."});
 assert.match(p.first,/watering can/);
 assert.match(p.text,/visible local rules/);
});
test("unmatched question remains useful",()=>{
 const p=makeNextMove({kind:"question",particular:"Why is our schedule so confusing?"});
 assert.equal(p.topic,"general");
 assert.match(p.text,/one sourced answer/);
 assert.match(p.text,/Ask permission/);
});
test("invalid input cannot be presented as a plan",()=>{
 assert.throws(()=>makeNextMove(null),/valid porch note/);
 assert.throws(()=>makeNextMove({kind:"fake",particular:"A real request."}),/valid porch note/);
 assert.throws(()=>makeNextMove({kind:"need",particular:" "}),/valid porch note/);
});

test("a glance is helpful without pulling visitors into a larger task",()=>{
 const p=makeNextMove(base,{attention:"glance"});
 assert.equal(p.attentionSeconds,30);
 assert.equal(p.flow,"need");
 assert.match(p.first,/one sentence/);
 assert.doesNotMatch(p.first,/Ask an established local food contact/);
 assert.match(p.text,/Half a minute/);
 assert.match(p.text,/not sent · not a match/);
});
test("longer attention never implies automatic outreach",()=>{
 const p=makeNextMove({kind:"offer",particular:"I can share garden tools."},{attention:"longer"});
 assert.equal(p.attentionSeconds,1200);
 assert.equal(p.flow,"offer");
 assert.match(p.text,/Ask what would actually be useful/);
 assert.match(p.text,/not a commitment/);
});
test("attention is temporary and does not alter the visitor's original note",()=>{
 const original={kind:"question",particular:"Could we learn why tools sit unused?",next:"Ask one curious neighbor."};
 const copy=JSON.stringify(original);
 const quick=makeNextMove(original,{attention:"glance"});
 const longer=makeNextMove(original,{attention:"longer"});
 assert.notEqual(quick.first,longer.first);
 assert.equal(JSON.stringify(original),copy);
 assert.equal(quick.flow,longer.flow);
 assert.equal(quick.topic,longer.topic);
});
test("unrecognized attention values are refused, not silently converted",()=>{
 assert.throws(()=>makeNextMove(base,{attention:"all-day"}),/attention window/);
});

test("visitor-chosen action remains primary at every attention window",()=>{
 const x={kind:"need",particular:"I need help with a community garden.",next:"Talk about watering the tomatoes."};
 for(const attention of ["glance","few","longer"]){
  const plan=makeNextMove(x,{attention});
  assert.match(plan.first,/watering the tomatoes/);
 }
 assert.match(makeNextMove(x,{attention:"glance"}).first,/No action or contact is required now/);
});
