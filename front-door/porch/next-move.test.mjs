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
