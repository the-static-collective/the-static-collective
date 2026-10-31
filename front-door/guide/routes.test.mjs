import test from "node:test";
import assert from "node:assert/strict";
import {suggest} from "./routes.mjs";

test("a food idea finds the Garden without pretending a partner is present",()=>{
 const x=suggest("Can somebody help with a neighborhood vegetable garden?");
 assert.equal(x.matched,true);
 assert.ok(x.choices.some(p=>p.id==="food"));
 assert.ok(x.choices.some(p=>p.url==="https://garden.abundent.org/"));
});
test("music prompts include the Jubilee Circuit",()=>{
 const x=suggest("I'd love to make music with some neighbors");
 assert.ok(x.choices.some(p=>p.id==="music"));
});
test("a new visitor can skip typing",()=>{
 const x=suggest("");
 assert.equal(x.choices.length,3);
 assert.ok(x.choices.some(p=>p.id==="question"));
});
test("strange and unnamed questions do not get forced into a guessed category",()=>{
 const x=suggest("flibbertygibbet zzzwizzle");
 assert.equal(x.matched,false);
 assert.equal(x.choices.length,3);
});
test("a private need is handled as an unsent note, not an emergency promise",()=>{
 const x=suggest("I need support");
 assert.equal(x.choices[0].id,"porch-need");
 assert.ok(x.choices[0].description.includes("no help")||x.choices[0].description.includes("no help".toUpperCase())||x.choices[0].description.includes("no help is guaranteed"));
});
test("output destinations never contain visitor input",()=>{
 const secret="aSecretThingThatShouldNeverBeInAURL";
 const x=suggest(secret);
 assert.ok(x.choices.every(p=>!p.url.includes(secret)&&!p.description.includes(secret)));
});
test("routing is deterministic and bounded",()=>{
 const q="music ".repeat(5000);
 assert.deepEqual(suggest(q).choices.map(p=>p.id),suggest(q).choices.map(p=>p.id));
 assert.ok(suggest(q).choices.length<=3);
});
