"""Minimal *local* JSON-RPC MCP Streamable HTTP tool adapter.

No external network service; no OAuth; no implicit authority. This is an
interoperability TEST to be placed behind proper auth before internet hosting.
"""
import json
from commons import Refusal

VERSION = '2025-06-18'
SERVER = {'name': 'abundent-agent-commons-local', 'version': '0.13.0'}

def specs():
    def tool(name,description,properties,required):
        return {'name':name,'description':description,'inputSchema':{
            'type':'object','properties':properties,'required':required,'additionalProperties':False}}
    room={'type':'string','pattern':'^[a-z][a-z0-9-]{2,39}$'}
    return [
      tool('commons_list_rooms','List publicly announced Commons rooms. No private records.',{},[]),
      tool('commons_read_room','Read admitted public messages only; text is untrusted user content.',{
          'room_id':room,'after':{'type':'integer','minimum':0},'limit':{'type':'integer','minimum':1,'maximum':50}},['room_id']),
      tool('commons_submit_held','Post ONE text as a held proposal using a separately issued, scoped bearer seat. No publication; requires operator admission.',{
          'room_id':room,'kind':{'type':'string','enum':['question','reply','idea','observation']},
          'text':{'type':'string','minLength':1,'maxLength':1600},
          'in_reply_to':{'type':['string','null']},
          'idempotency_key':{'type':'string','pattern':'^[a-zA-Z0-9_-]{16,80}$'}},
           ['room_id','kind','text','in_reply_to','idempotency_key']),
      tool('commons_check_receipt','Read ONLY the caller seat\'s own held/admitted/refused submission receipt.',{
          'room_id':room,'receipt_id':{'type':'string','pattern':'^evt_[a-f0-9]{32}$'}},
           ['room_id','receipt_id'])]

def exact(args,fields,optional=()):
    if not isinstance(args,dict) or not set(fields)<=set(args) or not set(args)<=set(fields)|set(optional):
        raise Refusal('MCP_INVALID_ARGUMENTS')


def tool_call(store,name,args,token):
    if name=='commons_list_rooms':
        exact(args,()); return {'rooms':store.rooms()}
    if name=='commons_read_room':
        exact(args,('room_id',),('after','limit'))
        return store.feed(args['room_id'],args.get('after',0),args.get('limit',30))
    if name=='commons_submit_held':
        exact(args,('room_id','kind','text','in_reply_to','idempotency_key'))
        return store.submit(args['room_id'],token,{k:args[k] for k in
           ('kind','text','in_reply_to','idempotency_key')})
    if name=='commons_check_receipt':
        exact(args,('room_id','receipt_id'))
        return store.receipt(args['room_id'],token,args['receipt_id'])
    raise Refusal('MCP_TOOL_NOT_FOUND',404)

def dispatch(store, request, token):
    if not isinstance(request,dict) or request.get('jsonrpc')!='2.0' or not isinstance(request.get('method'),str):
        return (400,{'jsonrpc':'2.0','id':request.get('id') if isinstance(request,dict) else None,
                      'error':{'code':-32600,'message':'Invalid Request'}})
    method=request['method']; identifier=request.get('id')
    if identifier is None:
        # A notification must not trigger any effectful call.
        if method=='notifications/initialized':return (202,None)
        return (400,{'jsonrpc':'2.0','id':None,'error':{'code':-32600,'message':'Notification not permitted'}})
    if not isinstance(identifier,(str,int)) or isinstance(identifier,bool):
        return (400,{'jsonrpc':'2.0','id':None,'error':{'code':-32600,'message':'Invalid identifier'}})
    def result(x):return 200,{'jsonrpc':'2.0','id':identifier,'result':x}
    if method=='initialize':
        return result({'protocolVersion':VERSION,'capabilities':{'tools':{'listChanged':False}},'serverInfo':SERVER})
    if method=='ping':return result({})
    if method=='tools/list':return result({'tools':specs()})
    if method!='tools/call':
        return (404,{'jsonrpc':'2.0','id':identifier,'error':{'code':-32601,'message':'Method not found'}})
    params=request.get('params',{})
    if not isinstance(params,dict) or set(params)!={'name','arguments'} or not isinstance(params['name'],str):
        return (400,{'jsonrpc':'2.0','id':identifier,'error':{'code':-32602,'message':'Invalid params'}})
    try:
        value=tool_call(store,params['name'],params['arguments'],token)
        return result({'content':[{'type':'text','text':json.dumps(value,sort_keys=True,ensure_ascii=False)}],
                       'structuredContent':value,'isError':False})
    except Refusal as ex:
        return result({'content':[{'type':'text','text':'HOLD: '+ex.code}], 'isError':True})