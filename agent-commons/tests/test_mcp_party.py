import json,os,tempfile,unittest,sys
from pathlib import Path
from threading import Thread
from http.server import HTTPServer
from urllib.request import Request,urlopen
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from commons import Commons,app,Refusal
from mcp_bridge import dispatch,specs
from provider_party import party,call,ProviderHold,PROVIDERS

class _Response:
  def __init__(self,data):
    self.data=json.dumps(data).encode();self.status=200
  def __enter__(self):return self
  def __exit__(self,*a):pass
  def read(self,n):return self.data[:n]
class FakeProvider:
  def __init__(self):self.calls=[]
  def open(self,req,timeout):
    self.calls.append(req)
    if req.full_url.endswith(':generateContent'):
       return _Response({'candidates':[{'content':{'parts':[{'text':'A fictional volunteer could ask permission before displaying a sample shelf.'}]}}]})
    return _Response({'choices':[{'message':{'content':'Another view: label all commitments hypothetical until someone actually opts in.'}}]})

class MCPParty(unittest.TestCase):
  def setUp(self):
    self.d=tempfile.TemporaryDirectory(); self.c=Commons(str(Path(self.d.name)/'c.db'))
    self.c.add_room('first-table','First Room');self.one=self.c.add_seat('first-table','Question Host')
    self.http=HTTPServer(('127.0.0.1',0),app(self.c)); self.host=f'http://127.0.0.1:{self.http.server_port}'
    self.thread=Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
  def tearDown(self):
    self.http.shutdown();self.thread.join();self.http.server_close();self.c.close();self.d.cleanup()
  def mcp(self,method,params=None,token=None,origin=None,accept=True,request_id=1):
    body={'jsonrpc':'2.0','method':method,'id':request_id}
    if params is not None:body['params']=params
    headers={'Content-Type':'application/json','MCP-Protocol-Version':'2025-06-18',
      'Accept':'application/json, text/event-stream' if accept else 'application/json'}
    if token:headers['Authorization']='Bearer '+token
    if origin:headers['Origin']=origin
    req=Request(self.host+'/mcp',data=json.dumps(body).encode(),headers=headers)
    try:
      with urlopen(req,timeout=3) as r:return r.status,json.load(r)
    except HTTPError as e:return e.code,json.load(e)
  def seed(self):
    t=self.one['capability_once']
    r=self.c.submit('first-table',t,{'kind':'question','text':'At 6:14 a.m. in Waseca, a fictional octopus with a safety vest has three jars of beans. What useful act could it invite?',
                  'in_reply_to':None,'idempotency_key':'seed_question_1234567'})
    self.c.decide(r['receipt_id'],'ADMITTED');return r['receipt_id']
  def test_mcp_wire_named_tools_and_refusal_and_cold_read(self):
    self.assertEqual(self.mcp('initialize')[1]['result']['serverInfo']['name'],'abundent-agent-commons-local')
    tools=self.mcp('tools/list')[1]['result']['tools'];self.assertEqual(len(tools),4)
    self.assertEqual(self.mcp('tools/call',{'name':'commons_list_rooms','arguments':{}})[1]['result']['structuredContent']['rooms'][0]['room_id'],'first-table')
    self.assertEqual(self.mcp('tools/call',{'name':'commons_submit_held','arguments':{
        'room_id':'first-table','kind':'idea','text':'test idea','in_reply_to':None,
        'idempotency_key':'unique_test_submit_12345'}})[1]['result']['isError'],True)
    token=self.one['capability_once']
    body={'name':'commons_submit_held','arguments':{'room_id':'first-table','kind':'idea','text':'test idea','in_reply_to':None,
     'idempotency_key':'unique_test_submit_12345'}}
    code,ans=self.mcp('tools/call',body,token=token);self.assertEqual(code,200)
    self.assertEqual(ans['result']['structuredContent']['status'],'HELD_FOR_REVIEW')
    self.assertEqual(len(self.mcp('tools/call',{'name':'commons_read_room','arguments':{'room_id':'first-table'}})[1]['result']['structuredContent']['events']),0)
    rid=ans['result']['structuredContent']['receipt_id']
    self.assertTrue(self.mcp('tools/call',{'name':'commons_check_receipt','arguments':{'room_id':'first-table','receipt_id':rid}})[1]['result']['isError'])
    self.assertEqual(self.mcp('tools/call',{'name':'commons_check_receipt','arguments':{'room_id':'first-table','receipt_id':rid}},token=token)[1]['result']['structuredContent']['status'],'HELD_FOR_REVIEW')
    self.c.decide(rid,'ADMITTED')
    self.assertEqual(len(self.mcp('tools/call',{'name':'commons_read_room','arguments':{'room_id':'first-table'}})[1]['result']['structuredContent']['events']),1)
    self.assertEqual(self.mcp('tools/delete',{})[0],404)
    self.assertEqual(self.mcp('tools/list',accept=False)[0],406)
    self.assertEqual(self.mcp('tools/list',origin='https://hostile.example')[0],403)
    self.assertEqual(self.c.verify()['entries'],2)
  def test_explicit_party_dry_run_and_bounded_real_provider_spies(self):
    self.seed()
    dry=party(self.c,'first-table',['groq','gemini'])
    self.assertEqual(dry['model_calls'],0)
    self.assertEqual(len(self.c.pending()),0)
    with self.assertRaises(ProviderHold):party(self.c,'first-table',['nemotron'],live=True)
    with self.assertRaises(ProviderHold):party(self.c,'first-table',['groq','groq'],live=True)
    with self.assertRaises(ProviderHold):call('groq','fixture',env={})
    fake=FakeProvider()
    env={'GROQ_API_KEY':'fake-credential','GEMINI_API_KEY':'fake-credential','OPENROUTER_API_KEY':'fake-credential'}
    live=party(self.c,'first-table',['groq','gemini','openrouter'],live=True,opener=fake,env=env)
    self.assertEqual(live['model_calls'],3)
    self.assertEqual(len(fake.calls),3)
    self.assertEqual(len(self.c.pending()),3)
    self.assertEqual(len(self.c.feed('first-table')['events']),1)
    self.assertEqual([x['status'] for x in live['provider_attempts']],['REAL_API_RESPONSE_HELD_FOR_OPERATOR_REVIEW']*3)
    self.assertNotIn('fake-credential',json.dumps(live))
    self.assertEqual(self.c.verify()['entries'],5)
    first=self.c.pending()[0]['entry_id'];self.c.decide(first,'ADMITTED')
    self.assertEqual(len(self.c.feed('first-table')['events']),2)
    self.assertEqual(self.c.feed('first-table')['events'][-1]['in_reply_to'],self.c.feed('first-table')['events'][0]['id'])
  def test_provider_failures_independent_and_no_paid_fallback(self):
    self.seed();fake=FakeProvider()
    res=party(self.c,'first-table',['openrouter','gemini'],live=True,opener=fake,env={'GEMINI_API_KEY':'synthetic'})
    self.assertEqual(res['provider_attempts'][0]['reason'],'PROVIDER_KEY_MISSING')
    self.assertEqual(res['provider_attempts'][1]['status'],'REAL_API_RESPONSE_HELD_FOR_OPERATOR_REVIEW')
    self.assertEqual(len(fake.calls),1)
    self.assertEqual(len(self.c.pending()),1)

if __name__=='__main__':unittest.main()