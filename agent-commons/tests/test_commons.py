import json
import os
import tempfile
import unittest
from pathlib import Path
from threading import Thread
from http.server import HTTPServer
from urllib.error import HTTPError
from urllib.request import Request,urlopen
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from commons import Commons,Refusal,app

class CommonsTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.db=str(Path(self.tmp.name)/'room.sqlite')
        self.c=Commons(self.db)
        self.c.add_room('first-table','Public fictional test room')
        self.a=self.c.add_seat('first-table','Fictional Guest Alpha')
        self.b=self.c.add_seat('first-table','Fictional Guest Beta')
        self.http=HTTPServer(('127.0.0.1',0),app(self.c))
        self.url='http://127.0.0.1:'+str(self.http.server_port)
        self.t=Thread(target=self.http.serve_forever,daemon=True)
        self.t.start()
    def tearDown(self):
        self.http.shutdown();self.t.join();self.http.server_close();self.c.close();self.tmp.cleanup()
    def request(self,path,payload=None,token=None):
        headers={}
        if token:headers['Authorization']='Bearer '+token
        if payload is not None:
            headers['Content-Type']='application/json'
        req=Request(self.url+path,headers=headers,data=json.dumps(payload).encode() if payload is not None else None)
        try:
            with urlopen(req,timeout=3) as r:return (r.status,json.load(r))
        except HTTPError as e:return (e.code,json.load(e))
    def message(self,text,parent=None,key='sample_test_key_12345'):
        return {'kind':'question' if parent is None else 'reply','text':text,'in_reply_to':parent,'idempotency_key':key}
    def test_read_write_durable_by_named_seats_and_cold_restart(self):
        a=self.a['capability_once'];b=self.b['capability_once']
        self.assertEqual(self.request('/rooms')[0],200)
        self.assertEqual(self.request('/.well-known/agent-commons.json')[1]['mcp'],'LOCAL_STREAMABLE_HTTP_TEST_ONLY')
        self.assertEqual(self.request('/rooms/first-table/events',self.message('hi'))[0],401)
        original=self.message('At this test table, what can we make?')
        c,receipt=self.request('/rooms/first-table/events',original,a)
        self.assertEqual((c,receipt['status']),(202,'HELD_FOR_REVIEW'))
        self.assertFalse(self.request('/rooms/first-table/events')[1]['events'])
        self.assertEqual(self.request('/rooms/first-table/events',original,a)[1]['duplicate'],True)
        self.assertEqual(self.request('/rooms/first-table/events',self.message('different text'),a)[0],409)
        self.assertEqual(self.request('/rooms/first-table/receipts/'+receipt['receipt_id'],token=b)[0],404)
        self.c.decide(receipt['receipt_id'],'ADMITTED')
        messages=self.request('/rooms/first-table/events')[1]['events']
        self.assertEqual(messages[0]['by']['display_name'],'Fictional Guest Alpha')
        self.assertEqual(messages[0]['by']['identity_assurance'],'OPERATOR_ISSUED_CAPABILITY_NOT_PROVIDER_VERIFIED')
        parent=receipt['receipt_id']
        child=self.message('The second guest has a different idea.',parent=parent,key='second_test_key_12345')
        _,child_receipt=self.request('/rooms/first-table/events',child,b)
        self.assertEqual(len(self.request('/rooms/first-table/events')[1]['events']),1)
        self.c.decide(child_receipt['receipt_id'],'ADMITTED')
        self.assertEqual(len(self.request('/rooms/first-table/events')[1]['events']),2)
        self.assertEqual(self.c.verify()['entries'],4)
        self.c.close()
        self.c=Commons(self.db)
        self.assertEqual(self.c.verify()['entries'],4)
        self.assertEqual(self.c.feed('first-table')['events'][1]['in_reply_to'],parent)
        self.c.revoke(self.b['seat_id'])
        with self.assertRaisesRegex(Refusal,'AUTH_REQUIRED'):
            self.c.seat('first-table',b)
    def test_admission_restrictions_and_integrity_tamper_detection(self):
        token=self.a['capability_once']
        for bad in [self.message('x',parent='evt_'+'a'*32,key='no_parent_test_key1'),
                    self.message('<script>run</script>',key='html_test_key_12345')]:
            if '<script>' in bad['text']:
                # text is inert JSON and untrusted; never render it as HTML.
                c, r=self.request('/rooms/first-table/events',bad,token)
                self.assertEqual((c,r['status']),(202,'HELD_FOR_REVIEW'))
            else:self.assertEqual(self.request('/rooms/first-table/events',bad,token)[0],400)
        self.assertEqual(len(self.c.pending()),1)
        self.assertEqual(len(self.c.feed('first-table')['events']),0)
        eid=self.c.pending()[0]['entry_id']
        self.c.decide(eid,'REFUSED')
        self.assertEqual(self.c.receipt('first-table',token,eid)['status'],'REFUSED')
        self.assertFalse(self.c.feed('first-table')['events'])
        with self.assertRaises(Refusal):self.c.decide(eid,'ADMITTED')
        self.c.db.execute("UPDATE journal SET body=? WHERE entry_id=?",('{"text":"tampered"}',eid))
        with self.assertRaisesRegex(Refusal,'JOURNAL_CHAIN_BROKEN'):self.c.verify()
    def test_no_secret_in_open_agent_read(self):
        token=self.a['capability_once']
        for path in ('/rooms','/.well-known/agent-commons.json','/rooms/first-table/events'):
            status,content=self.request(path)
            self.assertEqual(status,200)
            self.assertNotIn(token,json.dumps(content))

if __name__=='__main__':unittest.main()