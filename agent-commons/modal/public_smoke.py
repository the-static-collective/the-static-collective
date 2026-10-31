"""Public health/read/MCP discovery only. No credentials, writes, or inference."""
import argparse
import json
import re
import urllib.request

BASE = 'https://kbhqacsdvjsstzyplqij.supabase.co/functions/v1/'


def read(url, payload=None):
    request = urllib.request.Request(url, data=None if payload is None else json.dumps(payload).encode(),
                                     headers={'Accept':'application/json', 'Content-Type':'application/json'})
    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read(40001)
        if response.status != 200 or len(raw) > 40000:
            raise ValueError('PUBLIC_READ_HOLD')
        return json.loads(raw)


def smoke(modal_url=None):
    front = read(BASE + 'agent-commons-frontdoor-016/health')
    assert front['status'] == 'LIVE_FRONTDOOR_NO_VERCEL' and front['modelCalls'] == 0
    quota = read(BASE + 'agent-commons-party-015/health')
    assert quota['providerCalls'] is False and quota['globalDailyMax'] == 6
    if modal_url:
        if not re.fullmatch(r'https://[A-Za-z0-9-]+\.modal\.run', modal_url):
            raise ValueError('ACTUAL_MODAL_HTTPS_URL_REQUIRED')
        health = read(modal_url + '/health')
        assert health['providerCallsOnGet'] == 0
        rooms = read(modal_url + '/api/rooms')
        source = modal_url
    else:
        source = BASE + 'agent-commons-014'
        rooms = read(source + '/rooms')
    assert any(room['room_id'] == 'first-table' for room in rooms['rooms'])
    tools = read(source + '/mcp', {'jsonrpc':'2.0','id':1,'method':'tools/list'})
    assert {tool['name'] for tool in tools['result']['tools']} == {
        'commons_list_rooms','commons_read_room','commons_submit_held'}
    return {'status':'TESTED', 'scope':'PUBLIC_READS_AND_MCP_DISCOVERY',
            'supabase016':'HEALTHY', 'modal':'PUBLIC_SMOKE_PASSED' if modal_url else 'NOT_TESTED',
            'providerCalls':0, 'writes':0, 'hostedChatGPTConnected':False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--modal-url', help='Use the exact URL from preflight.py --url')
    args = parser.parse_args()
    try:
        print(json.dumps(smoke(args.modal_url), indent=2))
    except Exception:
        print(json.dumps({'status':'HOLD','reason':'PUBLIC_SMOKE_FAILED','providerCalls':0}))
        raise SystemExit(1)
