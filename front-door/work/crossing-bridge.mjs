// CROSS-ROOM-009: an exact-shape, PUBLIC-ONLY, explicitly user-initiated file for the
// original webZ CROSSINGS-032 receiver. This is not a signed, delivered or accepted crossing.
// Native conformance is checked against webZ's pinned original source in GitHub Actions.
export const CROSSING_SCHEMA="abundent/public-crossing/v0";
export const TOPICS=Object.freeze(["grocery","milk","care","artists","park","church"]);
export const CAPACITIES=Object.freeze(["Listen","Research","Make a card","Gather people","Build a prototype","Make something expressive"]);
export function makePublicOnlyCrossing({topic,capacity},now=new Date()){
 if(!TOPICS.includes(topic)||!CAPACITIES.includes(capacity))throw Error("Choose a public topic and limited action.");
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error("A valid date is required.");
 return Object.freeze({
  schema:CROSSING_SCHEMA,
  scope:"PUBLIC_COMMUNITY_ONLY",
  standing:"PROPOSED_UNSENT",
  topic,capacity,createdAt:now.toISOString(),
  sourceStatus:"EDITORIAL_ONLY",
  reviewedEntryId:null,
  authority:{
   personAssigned:false,consentReceived:false,contactMade:false,
   workCompleted:false,partnerApproved:false
  }
 });
}
