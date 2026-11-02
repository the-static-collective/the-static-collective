// NEXT-MOVE-003: local, transparent guidance. This is not an AI model or a live match.
const topics = Object.freeze([
  {name:"food and growing", pattern:/\b(food|meal|bread|milk|produce|garden|farm|grocer|harvest|vegetable|fruit)\b/i,
   first:"Name the item, approximate quantity, and a safe window. Ask an established local food contact which small step they could actually accept.",
   boundary:"Keep personal addresses and anyone's food or health circumstances out of public notes. Check safe handling and storage independently."},
  {name:"rides and delivery", pattern:/\b(ride|transport|delivery|drive|pickup|pick.up|carpool|moving|carry)\b/i,
   first:"Name the general route, the approximate time window, and the smallest needed trip. Ask whether a willing adult can discuss it privately.",
   boundary:"Do not post home addresses, live locations, passenger details, or travel plans publicly. Verify consent and safe arrangements offline."},
  {name:"fixing and tools", pattern:/\b(repair|fix|tool|build|broken|heater|electric|plumb|wood|roof|mechanic)\b/i,
   first:"Describe the smallest safe part of the problem and what tools or skills it seems to require. Ask for an assessment before promising a fix.",
   boundary:"Avoid hazardous work without qualified help; never treat an online suggestion as a safety inspection."},
  {name:"gathering and people", pattern:/\b(event|church|music|festival|meeting|volunteer|gather|neighbor|community|group|table)\b/i,
   first:"Write one clear, low-commitment invitation: purpose, approximate duration, and what participants may freely decline.",
   boundary:"Get permission before naming an organization, volunteer, venue, or event as a partner."},
  {name:"learning and questions", pattern:/\b(learn|teach|study|explain|question|research|school|computer|code|website|app)\b/i,
   first:"Write the single answer that would change your next decision. Ask one relevant person what you have missed.",
   boundary:"Distinguish a useful suggestion from a checked fact; keep other people's private material out of examples."}
]);
const kindMoves=Object.freeze({
  need:{
    start:"Ask for one bounded bit of help, not an open-ended obligation.",
    proof:"Useful progress: a real person answers whether they can help with that specific step. A refusal still resolves uncertainty."
  },
  offer:{
    start:"Offer one small trial and ask if anybody wants it before doing work on their behalf.",
    proof:"Useful progress: someone explicitly accepts, declines, or changes the scope. An offer alone is not a completed act."
  },
  question:{
    start:"Find one answer or correction before turning the question into a project.",
    proof:"Useful progress: one sourced answer, an informed correction, or an explicit remaining unknown."
  }
});
export function makeNextMove(prepared) {
  if (!prepared || !Object.hasOwn(kindMoves, prepared.kind) || typeof prepared.particular !== "string" || prepared.particular.trim().length < 8) {
    throw new Error("Make a valid porch note first.");
  }
  const topic=topics.find(t=>t.pattern.test(prepared.particular)) || null;
  const kind=kindMoves[prepared.kind];
  const first=prepared.next?.trim()
    ? "Start with the small step you named: "+prepared.next.trim()
    : topic?.first || kind.start;
  const returnRule="Afterward, record only what you actually know: DONE, NOT YET, DECLINED, or UNKNOWN. Do not call a plan completed without confirmation.";
  const lines=[
    "ABUNDENT / A SMALL NEXT MOVE",
    "Local suggestion · not sent · not a match · not a commitment",
    "",
    "YOUR NEXT TEN MINUTES",
    first,
    "",
    "WHAT WOULD COUNT AS PROGRESS",
    kind.proof,
    "",
    "BEFORE INVOLVING SOMEONE ELSE",
    topic?.boundary || "Ask permission. Share only what is necessary. A suggestion or invitation is not another person's consent.",
    "",
    "IF NOBODY ANSWERS",
    "Keep your note, make the request smaller, or stop. You do not owe a stranger your time, story, or personal details.",
    "",
    "HOW TO CLOSE THE LOOP",
    returnRule,
    "",
    "This plan was assembled from visible local rules, not from live AI or a directory of available helpers."
  ];
  return Object.freeze({topic:topic?.name||"general",first,progress:kind.proof,boundary:topic?.boundary||"Ask permission. Share only what is necessary. A suggestion or invitation is not another person's consent.",text:lines.join("\n")});
}
