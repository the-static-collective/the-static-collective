from html.parser import HTMLParser
from pathlib import Path
import json
import unittest
root=Path(__file__).resolve().parents[1]
class Tags(HTMLParser):
  def __init__(self):
    super().__init__();self.links=[];self.head=[];self.scripts=[]
  def handle_starttag(self,tag,attrs):
    d=dict(attrs)
    if tag=='a':self.links.append(d.get('href'))
    if tag in ('h1','h2','h3'):self.head.append(tag)
    if tag=='script':self.scripts.append(d.get('type'))
class TestSite(unittest.TestCase):
  def test_static_human_first(self):
    s=(root/'index.html').read_text()
    t=Tags();t.feed(s)
    self.assertEqual(t.head.count('h1'),1)
    self.assertIn('/porch/?kind=need',t.links)
    self.assertIn('/explore/',t.links)
    self.assertIn('/for-computers/',t.links)
    self.assertIn('/porch/?kind=offer',t.links)
    self.assertCountEqual(t.scripts,['application/ld+json','module','module'])
    self.assertIn('noindex,nofollow',s)
  def test_machine_boundary(self):
    for f in ['for-computers/index.html','llms.txt','.well-known/abundent.json','robots.txt','style.css','explore/index.html','porch/index.html','porch/engine.mjs','porch/app.mjs','porch/porch.css','porch/engine.test.mjs','porch/private-inbox.mjs','feedback/index.html','feedback/widget.mjs','feedback/widget.css','try/index.html','try/demo.mjs','doors/index.html','guide/routes.mjs','guide/attendant.mjs','guide/attendant.css','guide/routes.test.mjs']:
      self.assertTrue((root/f).exists(),f)
    data=json.loads((root/'.well-known/abundent.json').read_text())
    self.assertEqual(data['status'],'PUBLIC_STAGING_CANDIDATE')
    self.assertIn('Disallow: /',(root/'robots.txt').read_text())
    self.assertIn('NOT THE APEX',(root/'llms.txt').read_text())


  def test_usable_porch(self):
    s=(root/'porch/index.html').read_text()
    t=Tags();t.feed(s)
    self.assertEqual(t.head.count('h1'),1)
    self.assertIn('mailto:us@abundent.org?subject=Hello%20from%20the%20porch',t.links)
    self.assertIn('noindex,nofollow',s)
    for term in ['id="porch-form"','id="note-preview"','id="result"','id="copy-note"','id="save-note"','id="email-note"']:
      self.assertIn(term,s)
    script=(root/'porch/app.mjs').read_text()
    self.assertNotIn('localStorage',script)
    self.assertIn('installPrivateReceiver',script)
    self.assertIn('id="send-private"',s)
    self.assertIn('id="private-consent"',s)
    self.assertIn('id="check-receipt"',s)
    self.assertIn('id="withdraw-receipt"',s)
    policy=json.loads((root/'vercel.json').read_text())
    csp=next(h['value'] for group in policy['headers'] for h in group['headers'] if h['key']=='Content-Security-Policy')
    self.assertIn("connect-src 'self' https://kbhqacsdvjsstzyplqij.supabase.co",csp)
    self.assertNotIn('localStorage',script)
  def test_feedback_and_demo_doors(self):
    for p in ['index.html','explore/index.html','porch/index.html','for-computers/index.html','feedback/index.html','try/index.html','doors/index.html']:
      s=(root/p).read_text()
      self.assertIn('/feedback/widget.mjs',s,p)
      self.assertIn('/feedback/widget.css',s,p)
    widget=(root/'feedback/widget.mjs').read_text()
    self.assertIn('Something broken?',widget)
    self.assertIn('action:"submit"',widget)
    self.assertIn('consent:true',widget)
    self.assertNotIn('localStorage',widget)
    self.assertNotIn('sessionStorage',widget)
    self.assertIn('id="demo-run"',(root/'try/index.html').read_text())
    self.assertIn('Nothing was submitted, posted, emailed, assigned, or matched.',(root/'try/index.html').read_text())
    self.assertIn('href="/doors/"',(root/'index.html').read_text())
    homepage=(root/'index.html').read_text()
    self.assertIn('id="jarvis-form"',homepage)
    self.assertIn('id="jarvis-reply"',homepage)
    self.assertIn('href="https://abundent.org/paper/"',homepage)
    self.assertIn('The porch guide is local-only.',homepage)
    router=(root/'guide/routes.mjs').read_text()
    self.assertNotIn('fetch(',router)
    self.assertNotIn('localStorage',router)
    self.assertNotIn('sessionStorage',router)

if __name__=='__main__': unittest.main()
