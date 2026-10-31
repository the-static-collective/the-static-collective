#!/usr/bin/env python3
"""NATIVE-SPECIFICITY-011 — evaluate what original CANNON actually retained.

Never repair the maker output silently. Record where the requested elements
landed and distinguish title echoing from generated-panel incorporation.
"""
import json,re,sys
from html.parser import HTMLParser
from pathlib import Path

REQUIRED = (
 "6:14 a.m.", "Waseca", "high-vis octopus", "61-minute",
 "three jars of dried beans", "guitar case", "chalkboard",
 "23-second film", "neighbor", "unnamed", "invent no help"
)

class Segments(HTMLParser):
 def __init__(self):
  super().__init__(); self.zone="outside";self.depth=0;self.hero=[];self.body=[]
 def handle_starttag(self,tag,attrs):
  if tag=="main": self.zone="panels";self.depth+=1
  elif self.zone=="panels": self.depth+=1
  if tag=="header" and self.zone=="outside":self.zone="hero"
 def handle_endtag(self,tag):
  if self.zone=="panels":
   self.depth-=1
   if self.depth<=0:self.zone="outside";self.depth=0
  elif tag=="header" and self.zone=="hero":self.zone="outside"
 def handle_data(self,data):
  if self.zone=="hero": self.hero.append(data)
  if self.zone=="panels": self.body.append(data)

def audit(folder):
 root=Path(folder)
 html=(root/"culture-out"/"comic.html").read_text(encoding="utf-8")
 plan=json.loads((root/"culture-out"/"receipt.json").read_text(encoding="utf-8"))
 field=(root/"culture-out"/"field-card.md").read_text(encoding="utf-8")
 p=Segments();p.feed(html)
 title=" ".join(p.hero)
 panels=" ".join(p.body)
 all_title=[word for word in REQUIRED if word.casefold() in title.casefold()]
 in_panels=[word for word in REQUIRED if word.casefold() in panels.casefold()]
 in_field=[word for word in REQUIRED if word.casefold() in field.casefold()]
 assert len(all_title)==len(REQUIRED),"CANNON did not preserve the question in its header"
 assert plan.get("schema")=="cannon.culture-forge-receipt/v1","Wrong native maker"
 assert '<article class="panel">' in html
 result={
   "schema":"abundent/native-specificity-audit-v1",
   "question": plan.get("topic"),
   "source":"Original pinned CANNON CULTURE-FORGE-005, actual emitted HTML and field-card",
   "requestedDetails":list(REQUIRED),
   "titleEchoed":all_title,
   "independentPanelUse":in_panels,
   "fieldCardEchoed":in_field,
   "requestedFilmSeconds":23,
   "filmProducedByThisMaker":False,
   "specificityOutcome":"TITLE_ECHO_ONLY" if len(in_panels)==0 else "SOME_PANELS_USE_DETAILS",
   "note":"Header and card can echo the supplied topic. Panels are fixed narrative grammar, not original scene composition. This is a test result, not a failure to produce files."
 }
 assert all(x not in panels for x in ("AccessKey","password","Bearer"))
 out=root/"graph-out"/"specificity-audit.json"
 out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 print(json.dumps({k:result[k] for k in ("specificityOutcome","titleEchoed","independentPanelUse","filmProducedByThisMaker")}))
 return result

if __name__=="__main__":
 assert len(sys.argv)==2,"pass working root directory"
 audit(sys.argv[1])
