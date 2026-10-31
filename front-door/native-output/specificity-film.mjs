#!/usr/bin/env node
// SPECIFICITY-011: exact original planZ -> CANNON -> Haunted Toaster -> Dogram.
// The only freeform brief is a PUBLIC, FIXED, FICTIONAL repo fixture.
// It must never run with visitor text, private case details or external recipients.
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {mkdirSync,existsSync,readFileSync,writeFileSync} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {pathToFileURL,fileURLToPath} from "node:url";
const local=resolve(dirname(fileURLToPath(import.meta.url)));
const fail=(ok,msg)=>{if(!ok)throw Error("SPECIFICITY_HOLD_"+msg)};
const js=x=>JSON.stringify(x,null,2)+"\n";
const hash=x=>createHash("sha256").update(x).digest("hex");
function child(file,args){
 return execFileSync(process.execPath,[file,...args],{
  encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:240000,maxBuffer:1000000
 }).trim();
}
async function run(cannon,planz,toaster,out){
 const fixture=JSON.parse(readFileSync(join(local,"specificity-fixture-v1.json"),"utf8"));
 fail(fixture.schema==="abundent/specificity-pressure-test-v1"&&
  fixture.status==="FICTIONAL_PUBLIC_FIXTURE"&&!fixture.publicationAuthorized&&
  !fixture.realParticipants&&fixture.brief.length<=240&&fixture.brief.length>=45,
  "PRIVATE_OR_INVALID_BRIEF");
 fail(!existsSync(out),"OUTPUT_EXISTS");
 const p=await import(pathToFileURL(join(planz,"reactor/minute-mail.mjs")).href);
 const intent=p.startCreativeBrief(fixture.brief);
 fail(intent.originalObjective===fixture.brief&&intent.rightsGranted===false,"PLANNER_CHANGED_BRIEF");
 mkdirSync(out,{recursive:false});
 const save=(name,value)=>writeFileSync(join(out,name),js(value),{flag:"wx"});
 save("request.json",fixture);save("intent.json",intent);
 const runner=join(cannon,"scripts/minute-mail-native.mjs");
 const plan0=p.planNext(intent,0);save("plan0.json",plan0);
 const proof=join(out,"proof");
 child(runner,["build","--plan",join(out,"plan0.json"),"--toaster",toaster,"--out",proof,"--authorize","SYNTHETIC_TEST_ONLY"]);
 child(runner,["verify","--plan",join(out,"plan0.json"),"--toaster",toaster,"--out",proof]);
 const prev=JSON.parse(readFileSync(join(proof,"native-proof.json"),"utf8"));
 const evidence={schema:"jarvis.minute-mail-return/v1",round:0,kind:"PROOF_FILM",
  planSha256:plan0.planSha256,
  nativeArtifactSha256:hash(readFileSync(join(proof,"native-proof.json"))),
  rightsGranted:false,published:false};
 const plan1=p.planNext(intent,1,plan0,evidence);save("plan1.json",plan1);
 const revised=join(out,"revised");
 child(runner,["build","--plan",join(out,"plan1.json"),"--toaster",toaster,"--out",revised,"--authorize","SYNTHETIC_TEST_ONLY"]);
 child(runner,["verify","--plan",join(out,"plan1.json"),"--toaster",toaster,"--out",revised]);
 const next=JSON.parse(readFileSync(join(revised,"native-proof.json"),"utf8"));
 fail(prev.nativeMedia.videoSha256!==next.nativeMedia.videoSha256,"NO_ACTUAL_REVISION");
 const poster=[...plan0.subtitleLines,...plan1.subtitleLines].join(" ").toLowerCase();
 const cues=fixture.requirements.map(cue=>({
  cue,
  verbatimInPlannerInput:intent.originalObjective.toLowerCase().includes(cue.toLowerCase()),
  representedInOriginalOnScreenText:poster.includes(cue.toLowerCase())
 }));
 const audit={
  schema:"abundent/native-film-specificity-observation-v1",
  underlyingSource:"Original pinned planZ minute-mail reactor, CANNON INSPAND-019 and Haunted Toaster",
  inputs:{requestedSeconds:fixture.requestedFilmSeconds,plannedScriptedSeconds:[plan0.shotSeconds,plan1.shotSeconds],
   requestedSpecifics:fixture.requirements},
  observed:{sourceBriefRetained:true, nativeVideosProduced:2,
   nativeDogramReceipts:2, distinctNativeVideoHashes:true,
   exactRequestedSecondsInOneFilm:false,
   detailsInOnScreenText:cues.filter(x=>x.representedInOriginalOnScreenText).map(x=>x.cue),
   detailsOnlyPreservedInBrief:cues.filter(x=>!x.representedInOriginalOnScreenText).map(x=>x.cue),
   humanOutcomeVerified:false,publicationAuthorized:false},
  originalFilmResults:{proofVideoSha256:prev.nativeMedia.videoSha256,
    revisedVideoSha256:next.nativeMedia.videoSha256},
  verdict:"TWO_REAL_NATIVE_FILMS_NOT_FAITHFUL_TO_THE_WEIRDLY_SPECIFIC_BRIEF",
  limitation:"The original planZ owner compiles a narrow hardcoded title and phrase, so it does not direct Toaster to illustrate the named objects, setting or requested 23-second length.",
  allowedNextStep:"Source-owning CANNON/planZ PR must introduce input-safe scene slots/scene objects, native output receipts and a new cold fidelity test before promising bespoke films."
 };
 save("specificity-audit.json",audit);
 console.log(js({result:audit.verdict,films:2,planDurations:audit.inputs.plannedScriptedSeconds,
  specificRequested:fixture.requirements.length,
  visibleSpecifics:audit.observed.detailsInOnScreenText,
  rightsGranted:false,sha:[prev.nativeMedia.videoSha256,next.nativeMedia.videoSha256]}));
}
if(process.argv.length!==6){
 console.error("Usage: node specificity-film.mjs <CANNON_ROOT> <PLANZ_ROOT> <TOASTER_ROOT> <NEW_OUT_DIR>");
 process.exit(2);
}
try{await run(...process.argv.slice(2).map(x=>resolve(x)))}
catch(e){console.error(String(e.stack||e).slice(0,1200));process.exitCode=2}
