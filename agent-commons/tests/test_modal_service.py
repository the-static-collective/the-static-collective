import json
import os
import sys
import uuid
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "modal"))
from service import build_app, normalize, provider_ready, page_html

ROOM_ID = str(uuid.uuid4())
LAST_ID = str(uuid.uuid4())
CLAIM = str(uuid.uuid4())
SUB = str(uuid.uuid4())
ROOM = {"room":"first-table", "events":[{"id":LAST_ID,"text":"A fictional octopus runs a pop-up bean shelf in Waseca.",
        "content_sha256":"a"*64,"by":{"label":"Test visitor"},"kind":"question", "in_reply_to":None}]}
COMPLETE = {"choices":[{"message":{"content":json.dumps({"contribution":"A neighbor can leave a question without giving their name.",
 "uncertainty":"No willing real-world partner has been confirmed for this test."})}}]}


def fake_transport(records, *, failure=False):
    def handler(req):
        url=str(req.url)
        records.append((req.method,url))
        if url.endswith("/agent-commons-014/rooms"):
            return httpx.Response(200,json={"rooms":[{"room_id":"first-table","title":"First Table"}]})
        if url.endswith("/agent-commons-014/rooms/first-table"):
            return httpx.Response(200,json=ROOM)
        if url.endswith("/agent-commons-party-015/claim"):
            return httpx.Response(200,json={"status":"CLAIMED_ONE_ATTEMPT","claim_id":CLAIM})
        if url.endswith("/agent-commons-party-015/finish"):
            return httpx.Response(200,json={"status":"DONE"})
        if url.endswith("/agent-commons-014/mcp"):
            data=json.loads(req.content)
            if data.get('method')=='tools/call' and data.get('params',{}).get('name')=='commons_submit_held':
                return httpx.Response(200,json={"jsonrpc":"2.0","result":{"content":[{"text":json.dumps({"receipt":{"receipt_id":SUB,"status":"HELD_FOR_REVIEW"}})}]}})
            return httpx.Response(200,json={"jsonrpc":"2.0","id":data.get('id'),"result":{"tools":[]}})
        if url.startswith("https://api.groq.com/"):
            if failure:return httpx.Response(429,json={"error":"quota"})
            return httpx.Response(200,json=COMPLETE)
        raise AssertionError(f"Unexpected outbound call {req.method} {url}")
    return httpx.MockTransport(handler)


def client_for(records, failure=False):
    return TestClient(build_app(lambda: httpx.AsyncClient(transport=fake_transport(records,failure=failure),timeout=10)))


def config():
    return {"COMMONS_OPERATOR_TOKEN":"z"*52,"COMMONS_GROQ_SEAT_TOKEN":"a"*52,"GROQ_API_KEY":"test_fake_key_abcdefgh"}


def test_public_page_actual_admitted_only_and_html_escapes():
    events=[{**ROOM['events'][0],"text":"<script>surprise</script>"}]
    html=page_html(events)
    assert '<script>surprise' not in html and '&lt;script&gt;surprise' in html
    with client_for([]) as client:
        assert client.get('/').status_code==200
        assert 'octopus' in client.get('/').text
        assert client.get('/api/rooms/other-room').status_code==404
        assert client.get('/health').json()['providerCallsOnGet']==0


def test_mcp_read_passes_protocol_and_no_arbitrary_tools():
    records=[]
    with client_for(records) as client:
        good={"jsonrpc":"2.0","id":2,"method":"tools/list"}
        assert client.post('/mcp',json=good).json()['result']=={"tools":[]}
        assert client.post('/mcp',json={**good,"method":"tools/call","params":{"name":"execute_shell"}}).status_code==400
        assert client.post('/mcp',json={**good,"method":"tools/call","params":{"name":"commons_submit_held"}}).status_code==401
        assert len(records)==1


def test_operator_required_before_any_inference_or_quota():
    records=[]
    with patch.dict(os.environ,config()):
      with client_for(records) as client:
        p={"room":"first-table","provider":"groq"}
        assert client.post('/api/party',json=p).status_code==401
        assert client.post('/api/party',json=p,headers={"Authorization":"Bearer "+'z'*52}).status_code==403
        assert client.post('/api/party',json=p,headers={"Authorization":"Bearer "+'z'*52,'x-commons-explicit-action':'I_APPROVE_PUBLIC_AI_PARTY','Origin':'https://evil.example'}).status_code==403
        assert not records


def test_real_one_provider_shape_to_held_receipt_only():
    records=[]
    with patch.dict(os.environ,config()):
      with client_for(records) as client:
        p={"room":"first-table","provider":"groq"}
        response=client.post('/api/party',json=p,headers={'Authorization':'Bearer '+'z'*52,'x-commons-explicit-action':'I_APPROVE_PUBLIC_AI_PARTY'})
        assert response.status_code==200,response.text
        x=response.json()
        assert x['status']=='REAL_PROVIDER_CONTRIBUTION_HELD' and x['publiclyAdmitted']==False
        assert x['providerCalls']==1 and x['receiptId']==SUB
        assert sum('api.groq.com' in url for _,url in records)==1
        assert sum('/claim' in url for _,url in records)==1
        assert sum('/finish' in url for _,url in records)==1
        assert sum('api.openrouter.ai' in url for _,url in records)==0


def test_provider_failure_recorded_no_retry_no_fallback():
    records=[]
    with patch.dict(os.environ,config()):
      with client_for(records,failure=True) as client:
        r=client.post('/api/party',json={"room":"first-table","provider":"groq"},headers={'Authorization':'Bearer '+'z'*52,'x-commons-explicit-action':'I_APPROVE_PUBLIC_AI_PARTY'})
        assert r.status_code==503 and r.json()['status']=='HOLD'
        assert r.json()['providerCalls']==1
        assert sum('api.groq.com' in url for _,url in records)==1
        assert sum('/finish' in url for _,url in records)==1
        assert sum('api.openrouter.ai' in url for _,url in records)==0


def test_bad_model_output_and_missing_provider_refused():
    for body in ({"contribution":"nice", "uncertainty":"too short"},{"contribution":"x"*20,"uncertainty":"y"*20,"extra":"bad"}):
        try:
            normalize({"choices":[{"message":{"content":json.dumps(body)}}]},'groq')
            raise AssertionError('bad output accepted')
        except RuntimeError:
            pass
    with patch.dict(os.environ, {"COMMONS_CLOUDFLARE_METERED_ACK":"0"},clear=True):
        assert not provider_ready('cloudflare-nemotron')