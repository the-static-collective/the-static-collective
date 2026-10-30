import assert from "node:assert/strict";
// Public GET-only smoke; no private notes or credentials. A READY deployment alone
// is not proof that any human can reach the page through public DNS.
const base="https://hello.abundent.org";
const paths=[
 ["/","What's one thing"],
 ["/porch/","What brings you by?"],
 ["/feedback/","Something broken?"],
 ["/try/","Try the tiny demo."],
 ["/doors/","Every door we can point to."],
 ["/feedback/widget.mjs","Send report"],
 ["/feedback/widget.css",".ab-feedback-button"],
 ["/try/demo.mjs","SYNTHETIC EXAMPLE"]
];
for(const [path,token] of paths){
 const res=await fetch(base+path,{redirect:"follow",signal:AbortSignal.timeout(16000)});
 const body=await res.text();
 assert.equal(res.status,200,path+" must return HTTP 200");
 assert.ok(body.includes(token),path+" missing expected public content");
 if(path==="/") {
  assert.match(res.headers.get("content-security-policy")||"",/connect-src[^;]*kbhqacsdvjsstzyplqij\.supabase\.co/);
 }
 console.log("PUBLIC GET OK",path,"HTTP",res.status);
}
console.log("Public first-party site routing and feedback entry verified (GET only, no person or mail touched).");

try {
 const home=await fetch("https://abundent.org/",{signal:AbortSignal.timeout(16000),redirect:"follow"});
 const source=await home.text();
 console.log("EXISTING APEX",home.status,"human-link-present=",source.includes("https://hello.abundent.org/"),"main-webZ=",source.includes("A WEB OF WORLDS"));
} catch(e) {console.log("EXISTING APEX observation unavailable:",e.name);}
