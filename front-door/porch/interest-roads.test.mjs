import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkCatalog,selectInterestRoads} from "./interest-roads.mjs";
const catalog=JSON.parse(readFileSync(new URL("./interest-roads-v1.json",import.meta.url),"utf8"));
const request=(particular,kind="need",next="")=>({kind,particular,next,area:"Waseca, MN"});
test("catalog is source-pinned and only a public editorial snapshot",()=>{
 checkCatalog(catalog);
 assert.equal(catalog.sources.length,2);
 assert.equal(catalog.entries.length,30);
 assert.equal(catalog.status,"SOURCE_PINNED_EDITORIAL_SNAPSHOT_NOT_LIVE_AVAILABILITY");
});
test("food problem finds documented food-related experiments and distinct plan questions",()=>{
 const r=selectInterestRoads(request("I would like help distributing leftover bread from a garden table."),catalog);
 assert.ok(r.experiments.some(x=>x.id==="GARDEN-001"));
 assert.ok(r.questions.some(x=>x.id==="GARDEN-TABLE-001"||x.id==="SHELF-001"));
 assert.ok(r.experiments.length<=3&&r.questions.length<=1);
 assert.ok(r.questions.every(x=>x.executionAllowed===false));
});
test("music interest opens a music door, not a person match",()=>{
 const r=selectInterestRoads(request("Could we host a little music festival?", "question"),catalog);
 assert.ok(r.experiments.some(x=>x.tags.includes("music")));
 assert.ok(r.experiments.every(x=>x.sourceUrl.startsWith("https://")));
});
test("absent interest gives no fake result and generic help words do not force results",()=>{
 const a=selectInterestRoads(request("Could someone walk my pet iguana tomorrow?"),catalog);
 const b=selectInterestRoads(request("I need a little help from people in our community."),catalog);
 assert.equal(a.experiments.length,0);assert.equal(a.questions.length,0);
 assert.equal(b.experiments.length,0);assert.equal(b.questions.length,0);
});
test("area does not manufacture proximity or leak into a query",()=>{
 const a=selectInterestRoads({...request("I would like a snack."),area:"Waseca"},catalog);
 const b=selectInterestRoads({...request("I would like a snack."),area:"Accra"},catalog);
 assert.deepEqual(a.experiments.map(x=>x.id),b.experiments.map(x=>x.id));
});
test("malformed catalog and false partner authority fail closed",()=>{
 assert.throws(()=>checkCatalog({...catalog,entries:[]}),/unavailable/);
 const tampered=structuredClone(catalog);
 tampered.entries.find(e=>e.lane==="question").executionAllowed=true;
 assert.throws(()=>checkCatalog(tampered),/authority/);
 const broken=structuredClone(catalog);broken.entries[0].openUrl="javascript:alert(1)";
 assert.throws(()=>checkCatalog(broken),/invalid/);
});
test("no unsupported user profiles, missing text or global recipient claims",()=>{
 assert.throws(()=>selectInterestRoads(request("x"),catalog),/note first/);
 assert.throws(()=>selectInterestRoads({kind:"human",particular:"I would like bread."},catalog),/note first/);
 for(const e of catalog.entries)assert.ok(!("contact" in e||"recipient" in e||"emailAddress" in e));
});
