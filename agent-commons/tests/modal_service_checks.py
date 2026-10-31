import json
import logging
import os
import sys
import uuid
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "modal"))
from service import PROVIDERS, SEAT_ENV, build_app, normalize, provider_ready, page_html

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
            return httpx.Response(200,json={"status":"HELD_SUBMITTED","claim_id":CLAIM,"publicly_admitted":False})
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

# Regression: malformed credentials/input must HOLD without leaking a traceback.
def test_malformed_operator_and_mcp_headers_fail_closed():
    with patch.dict(os.environ, {"COMMONS_OPERATOR_TOKEN": "é" * 52}, clear=True):
        with client_for([]) as client:
            r = client.post('/api/party', json={"room":"first-table","provider":"groq"},
                            headers={"Authorization":"Bearer " + "z" * 52})
            assert r.status_code == 401
    with client_for([]) as client:
        r = client.post('/mcp', content=b'{}', headers={"content-length":"invalid"})
        assert r.status_code == 400


def test_empty_uppercase_gemini_key_uses_existing_mixed_case_alias():
    with patch.dict(os.environ, {"COMMONS_GEMINI_SEAT_TOKEN":"b"*52,
                                "GEMINI_API_KEY":"", "Gemini_API_Key":"synthetic-existing-key"}, clear=True):
        assert provider_ready('gemini')


def test_wrong_seat_auth_from_upstream_stays_unauthorized():
    transport = httpx.MockTransport(lambda req: httpx.Response(401, json={"error":"AUTH_REQUIRED"}))
    app = build_app(lambda: httpx.AsyncClient(transport=transport))
    with TestClient(app) as client:
        r = client.post('/mcp', headers={"Authorization":"Bearer " + "q"*52}, json={
            "jsonrpc":"2.0", "id":1, "method":"tools/call", "params":{
                "name":"commons_submit_held", "arguments":{"room":"first-table"}}})
        assert r.status_code == 401
        assert r.json()['reason'] == 'SEAT_AUTH_REJECTED'


def provider_config(provider):
    return {**config(), SEAT_ENV[provider]: 's'*52,
            'GEMINI_API_KEY':'', 'Gemini_API_Key':'synthetic-gemini-key',
            'OPENROUTER_API_KEY':'synthetic-openrouter-key',
            'CLOUDFLARE_API_TOKEN':'synthetic-cloudflare-key',
            'CLOUDFLARE_ACCOUNT_ID':'a'*32, 'COMMONS_CLOUDFLARE_METERED_ACK':'1'}


def flow_client(records, provider, *, claim_status=200, outcome='ok', finish='ok'):
    def handler(req):
        path = req.url.path
        body = json.loads(req.content) if req.content else None
        records.append((req, body))
        if path.endswith('/rooms/first-table'):
            return httpx.Response(200, json=ROOM)
        if path.endswith('/claim'):
            assert req.headers['authorization'] == 'Bearer ' + 's'*52
            assert body['room'] == 'first-table' and body['provider'] == provider
            assert len(body['context_sha256']) == 64
            return httpx.Response(claim_status, json={'status':'CLAIMED_ONE_ATTEMPT','claim_id':CLAIM})
        if path.endswith('/finish'):
            assert body['claim_id'] == CLAIM
            if finish == 'timeout':
                raise httpx.ReadTimeout('synthetic-private-context')
            return httpx.Response(200, json={'status':'HELD_SUBMITTED' if finish == 'ok' else 'WRONG',
                                            'claim_id':CLAIM, 'publicly_admitted':False})
        if path.endswith('/mcp'):
            assert body['params']['name'] == 'commons_submit_held'
            assert body['params']['arguments']['parent_id'] == LAST_ID
            assert body['params']['arguments']['kind'] == 'idea'
            return httpx.Response(200, json={'result':{'content':[{'text':json.dumps({
                'receipt':{'receipt_id':SUB,'status':'HELD_FOR_REVIEW'}})}]}})
        assert req.url.host in {'api.groq.com', 'generativelanguage.googleapis.com', 'openrouter.ai', 'api.cloudflare.com'}
        assert sum(r.url.host == req.url.host for r, _ in records) == 1
        assert next(i for i,(r,_) in enumerate(records) if r.url.path.endswith('/claim')) < len(records)-1
        if provider == 'gemini':
            assert req.headers['x-goog-api-key'] == 'synthetic-gemini-key'
        if provider == 'openrouter':
            assert body['model'] == 'openrouter/free'
        if outcome == 'timeout':
            raise httpx.ReadTimeout('synthetic-private-context')
        if outcome == '429':
            return httpx.Response(429, json={'error':'synthetic-private-context'})
        if outcome == 'oversize':
            return httpx.Response(200, content=b'x' * 100000)
        text = COMPLETE['choices'][0]['message']['content'] if outcome == 'ok' else 'bad-json'
        envelope = {'choices':[{'message':{'content':text}}]}
        if provider == 'gemini':
            envelope = {'candidates':[{'content':{'parts':[{'text':text}]}}]}
        if provider == 'cloudflare-nemotron':
            envelope = {'success':True,'result':{'response':text}}
        return httpx.Response(200, json=envelope)
    return TestClient(build_app(lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler))))


def party_headers():
    return {'Authorization':'Bearer '+'z'*52, 'x-commons-explicit-action':'I_APPROVE_PUBLIC_AI_PARTY'}


@pytest.mark.parametrize('provider', PROVIDERS)
def test_each_provider_claims_once_then_submits_held_without_publication(provider, caplog):
    records = []
    caplog.set_level(logging.DEBUG)
    with patch.dict(os.environ, provider_config(provider), clear=True):
        with flow_client(records, provider) as client:
            before = client.get('/api/rooms/first-table').json()
            r = client.post('/api/party', json={'room':'first-table','provider':provider}, headers=party_headers())
            assert r.status_code == 200 and r.json()['publiclyAdmitted'] is False
            assert r.json()['providerCalls'] == 1 and r.json()['receiptId'] == SUB
            assert client.get('/api/rooms/first-table').json() == before
    assert len([r for r,_ in records if r.url.host != 'kbhqacsdvjsstzyplqij.supabase.co']) == 1
    for name, value in provider_config(provider).items():
        if name != "CLOUDFLARE_ACCOUNT_ID" and len(value) >= 12:
            assert value not in caplog.text
    assert ROOM['events'][0]['text'] not in caplog.text
    assert COMPLETE['choices'][0]['message']['content'] not in caplog.text


@pytest.mark.parametrize('status', [401, 409, 429, 503])
def test_quota_or_wrong_scope_rejection_makes_zero_provider_requests(status):
    records = []
    with patch.dict(os.environ, provider_config('groq'), clear=True):
        with flow_client(records, 'groq', claim_status=status) as client:
            r = client.post('/api/party', json={'room':'first-table','provider':'groq'}, headers=party_headers())
    assert r.json()['status'] == 'HOLD' and r.json()['providerCalls'] == 0
    assert len(records) == 2


@pytest.mark.parametrize('provider', PROVIDERS)
@pytest.mark.parametrize('outcome', ['429', 'timeout', 'invalid', 'oversize'])
def test_provider_failures_never_retry_or_fall_back(provider, outcome, caplog):
    records = []
    with patch.dict(os.environ, provider_config(provider), clear=True):
        with flow_client(records, provider, outcome=outcome) as client:
            r = client.post('/api/party', json={'room':'first-table','provider':provider}, headers=party_headers())
    assert r.status_code == 503 and r.json()['providerCalls'] == 1
    assert r.json()['paidFallback'] is False
    assert len([req for req,_ in records if req.url.host != 'kbhqacsdvjsstzyplqij.supabase.co']) == 1
    assert not any(req.url.path.endswith('/mcp') for req,_ in records)
    assert 'synthetic-private-context' not in r.text + caplog.text


@pytest.mark.parametrize('finish', ['wrong', 'timeout'])
def test_finish_must_be_confirmed_and_is_never_retried(finish):
    records = []
    with patch.dict(os.environ, provider_config('groq'), clear=True):
        with flow_client(records, 'groq', finish=finish) as client:
            r = client.post('/api/party', json={'room':'first-table','provider':'groq'}, headers=party_headers())
    assert r.status_code == 503 and r.json()['status'] == 'HOLD'
    assert sum(req.url.path.endswith('/finish') for req,_ in records) == 1


@pytest.mark.parametrize('provider', PROVIDERS)
@pytest.mark.parametrize('missing', ['seat', 'key'])
def test_unconfigured_provider_is_held_before_any_outbound_request(provider, missing):
    settings = provider_config(provider)
    keys = {'groq':['GROQ_API_KEY'], 'gemini':['GEMINI_API_KEY','Gemini_API_Key'],
            'openrouter':['OPENROUTER_API_KEY'], 'cloudflare-nemotron':['CLOUDFLARE_API_TOKEN']}
    for key in [SEAT_ENV[provider]] if missing == 'seat' else keys[provider]:
        settings.pop(key, None)
    records = []
    with patch.dict(os.environ, settings, clear=True):
        with flow_client(records, provider) as client:
            r = client.post('/api/party', json={'room':'first-table','provider':provider}, headers=party_headers())
    assert r.status_code == 503 and r.json()['reason'] == 'PROVIDER_SEAT_NOT_CONFIGURED'
    assert r.json()['providerCalls'] == 0 and records == []
