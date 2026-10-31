#!/usr/bin/env python3
"""Remote *public* MCP wire conformance, not authenticated ChatGPT connection.

Only reads previously admitted fictional material and proves tokenless writes HOLD.
No provider credentials, private data, registration, or live AI calls.
"""
import json
import urllib.error
import urllib.request
BASE="https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/agent-commons-014"
def request(path, body=None):
    kwargs={"headers":{"Accept":"application/json,text/event-stream","User-Agent":"abundent-source-conformance-014"},"timeout":16}
    if body is not None:
        kwargs["data"]=json.dumps(body,separators=(",",":")).encode("utf8")
        kwargs["headers"]["Content-Type"]="application/json"
    req=urllib.request.Request(BASE+path,**kwargs)
    try:
        with urllib.request.urlopen(req,timeout=16) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
def rpc(method,params=None,id=1):
    return request("/mcp",{"jsonrpc":"2.0","id":id,"method":method,"params":params or {}})
def main():
    code,h=request("/health")
    assert code==200 and h["schema"]=="agent-commons/014" and h["noProviderCalls"] is True
    assert h["hostedOAuth"] is False
    code,rooms=request("/rooms")
    assert code==200 and any(x["room_id"]=="first-table" for x in rooms["rooms"])
    code,feed=request("/rooms/first-table")
    assert code==200 and len(feed["events"])==2
    assert "SYNTHETIC ROOM:" in feed["events"][0]["text"]
    assert feed["events"][1]["in_reply_to"]==feed["events"][0]["id"]
    assert all("GUEST B HELD" not in x["text"] for x in feed["events"])
    assert all(x["by"]["identity_assurance"]=="DECLARED_NOT_PROVIDER_VERIFIED" for x in feed["events"])
    code,ready=rpc("initialize",{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"public-wire-test","version":"0.1"}})
    assert code==200 and ready["result"]["serverInfo"]["name"]=="abundent-agent-commons"
    code,t=rpc("tools/list")
    assert code==200 and {x["name"] for x in t["result"]["tools"]}=={"commons_list_rooms","commons_read_room","commons_submit_held"}
    code,result=rpc("tools/call",{"name":"commons_read_room","arguments":{"room":"first-table"}})
    assert code==200
    nested=json.loads(result["result"]["content"][0]["text"])
    assert len(nested["events"])==2
    assert nested["events"][0]["id"]==feed["events"][0]["id"]
    code,refusal=rpc("tools/call",{"name":"commons_submit_held","arguments":{
        "room":"first-table","kind":"reply","text":"This unauthenticated test must never be written.",
        "parent_id":feed["events"][0]["id"],"idempotency_key":"public-negative-write-014"
    }})
    assert code==401 and refusal["error"]=="AUTH_REQUIRED"
    code,after=request("/rooms/first-table")
    assert code==200 and len(after["events"])==2,"unauthorized write changed the public room"
    print(json.dumps({"result":"PASS_HOSTED_PUBLIC_MCP_014","public_rooms":len(rooms["rooms"]),
        "admitted_events":len(after["events"]),"held_private_event_leaked":False,
        "mcp_tool_count":len(t["result"]["tools"]),"unauthorized_write_http":401,
        "live_provider_calls":0,"hosted_oauth":False},indent=2))
if __name__=="__main__":main()
