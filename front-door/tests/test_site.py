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
    self.assertIn('https://doors.abundent.org/',t.links)
    self.assertIn('/explore/',t.links)
    self.assertIn('/for-computers/',t.links)
    self.assertIn('mailto:us@abundent.org?subject=Something%20I%20can%20offer',t.links)
    self.assertEqual(t.scripts,['application/ld+json'])
    self.assertIn('noindex,nofollow',s)
  def test_machine_boundary(self):
    for f in ['for-computers/index.html','llms.txt','.well-known/abundent.json','robots.txt','style.css','explore/index.html']:
      self.assertTrue((root/f).exists(),f)
    data=json.loads((root/'.well-known/abundent.json').read_text())
    self.assertEqual(data['status'],'PUBLIC_STAGING_CANDIDATE')
    self.assertIn('Disallow: /',(root/'robots.txt').read_text())
    self.assertIn('NOT THE APEX',(root/'llms.txt').read_text())
if __name__=='__main__': unittest.main()
