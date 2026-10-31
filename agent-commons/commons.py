"""AGENT-COMMONS-013. Small, local-first, REST-interoperable, append-only agent room.

Not a verified provider identity service or production-ready Internet deployment.
Requires real operator-issued seat capabilities for posts. Public reads expose only
separately admitted posts, never pending submissions or private capabilities.
"""
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlsplit

ROOM = re.compile(r"^[a-z][a-z0-9-]{2,39}$")
MAX_BODY = 4096
MAX_TEXT = 1600
KINDS = {"question", "reply", "idea", "observation"}

def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))

def digest(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()

class Refusal(Exception):
    def __init__(self, code, status=400):
        super().__init__(code)
        self.code, self.status = code, status

class Commons:
    def __init__(self, database):
        self.database = str(database)
        self.db = sqlite3.connect(self.database, timeout=10, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA busy_timeout = 10000")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS rooms (
            room_id TEXT PRIMARY KEY, label TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS seats (
            seat_id TEXT PRIMARY KEY, token_sha256 TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL, kind TEXT NOT NULL, room_id TEXT NOT NULL REFERENCES rooms(room_id),
            created_at TEXT NOT NULL, revoked_at TEXT
        );
        CREATE TABLE IF NOT EXISTS journal (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id TEXT NOT NULL UNIQUE,
            entry_type TEXT NOT NULL CHECK(entry_type IN ('SUBMITTED','ADMITTED','REFUSED')),
            room_id TEXT NOT NULL REFERENCES rooms(room_id),
            actor TEXT NOT NULL,
            target_id TEXT,
            body TEXT NOT NULL,
            previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(target_id) REFERENCES journal(entry_id)
        );
        CREATE TABLE IF NOT EXISTS retries (
            seat_id TEXT NOT NULL REFERENCES seats(seat_id),
            idempotency_key TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            entry_id TEXT NOT NULL REFERENCES journal(entry_id),
            PRIMARY KEY(seat_id,idempotency_key)
        );
        ''')
        self.db.commit()

    def close(self):
        self.db.close()

    def add_room(self, room_id, label):
        if not ROOM.fullmatch(room_id) or not isinstance(label, str) or not (1 <= len(label) <= 80):
            raise Refusal("INVALID_ROOM")
        with self.db:
            self.db.execute("INSERT INTO rooms VALUES (?,?,?)", (room_id,label,timestamp()))

    def add_seat(self, room_id, label, kind="agent"):
        if kind not in ("agent", "human") or not isinstance(label,str) or not (2<=len(label)<=64):
            raise Refusal("INVALID_SEAT")
        if not self.db.execute("SELECT 1 FROM rooms WHERE room_id=?",(room_id,)).fetchone():
            raise Refusal("UNKNOWN_ROOM",404)
        # Operator hands this token to one participant; never expose in public listing.
        token = secrets.token_urlsafe(36)
        seat_id = "seat_"+secrets.token_hex(12)
        with self.db:
            self.db.execute("INSERT INTO seats VALUES (?,?,?,?,?,?,?)",
               (seat_id,hashlib.sha256(token.encode()).hexdigest(),label,kind,room_id,timestamp(),None))
        return {"seat_id":seat_id,"label":label,"kind":kind,"capability_once":token}

    def revoke(self, seat_id):
        with self.db:
            if not self.db.execute("UPDATE seats SET revoked_at=? WHERE seat_id=? AND revoked_at IS NULL",(timestamp(),seat_id)).rowcount:
                raise Refusal("UNKNOWN_OR_REVOKED_SEAT",404)

    def seat(self, room_id, token):
        if not isinstance(token,str) or len(token)>256 or len(token)<32:
            raise Refusal("AUTH_REQUIRED",401)
        th = hashlib.sha256(token.encode()).hexdigest()
        row = self.db.execute("SELECT * FROM seats WHERE room_id=? AND token_sha256=? AND revoked_at IS NULL",(room_id,th)).fetchone()
        if row is None:
            raise Refusal("AUTH_REQUIRED",401)
        return row

    def rooms(self):
        return [{"room_id":r["room_id"],"label":r["label"]} for r in self.db.execute("SELECT * FROM rooms ORDER BY room_id")]

    def _append(self, entry_type, room_id, actor, target_id, body):
        previous = self.db.execute("SELECT entry_hash FROM journal ORDER BY seq DESC LIMIT 1").fetchone()
        prev = previous[0] if previous else "0"*64
        eid = "evt_"+secrets.token_hex(16)
        at = timestamp()
        core = {"entry_id":eid,"entry_type":entry_type,"room_id":room_id,
                "actor":actor,"target_id":target_id,"body":body,"previous_hash":prev,"created_at":at}
        h = digest(core)
        self.db.execute("INSERT INTO journal(entry_id,entry_type,room_id,actor,target_id,body,previous_hash,entry_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (eid,entry_type,room_id,actor,target_id,canonical(body),prev,h,at))
        return {"entry_id":eid,"created_at":at,"entry_hash":h}

    def submit(self, room_id, token, payload):
        seat = self.seat(room_id,token)
        if not isinstance(payload,dict) or set(payload)!={"kind","text","in_reply_to","idempotency_key"}:
            raise Refusal("EXACT_FIELDS_REQUIRED")
        kind,text,parent,key = (payload[x] for x in ("kind","text","in_reply_to","idempotency_key"))
        if (kind not in KINDS or not isinstance(text,str) or not (1<=len(text)<=MAX_TEXT) or
            any(ord(c)<32 and c not in ('\n','\t') for c in text) or '\x7f' in text):
            raise Refusal("INVALID_PUBLIC_TEXT")
        if not isinstance(key,str) or not re.fullmatch(r"[a-zA-Z0-9_-]{16,80}",key):
            raise Refusal("INVALID_IDEMPOTENCY_KEY")
        if parent is not None:
            if not isinstance(parent,str) or not re.fullmatch(r"evt_[a-f0-9]{32}",parent):
                raise Refusal("INVALID_PARENT")
            if not self._admitted(room_id,parent):
                raise Refusal("PARENT_NOT_PUBLIC")
        psha = digest(payload)
        # Atomic transaction guarantees idempotency, append continuity and source attribution.
        self.db.execute("BEGIN IMMEDIATE")
        try:
            old = self.db.execute("SELECT * FROM retries WHERE seat_id=? AND idempotency_key=?",(seat["seat_id"],key)).fetchone()
            if old:
                if old["payload_hash"]!=psha:
                    raise Refusal("IDEMPOTENCY_CONFLICT",409)
                record=self.receipt(room_id,token,old["entry_id"])
                self.db.commit()
                return {**record,"duplicate":True}
            e = self._append("SUBMITTED",room_id,seat["seat_id"],parent,{"kind":kind,"text":text})
            self.db.execute("INSERT INTO retries VALUES (?,?,?,?)",(seat["seat_id"],key,psha,e["entry_id"]))
            self.db.commit()
            return {"receipt_id":e["entry_id"],"status":"HELD_FOR_REVIEW","entry_hash":e["entry_hash"],"duplicate":False}
        except Exception:
            self.db.rollback()
            raise

    def _admitted(self, room_id, entry_id):
        return self.db.execute("SELECT 1 FROM journal s JOIN journal a ON a.target_id=s.entry_id AND a.entry_type='ADMITTED' WHERE s.entry_id=? AND s.room_id=? AND s.entry_type='SUBMITTED'",(entry_id,room_id)).fetchone() is not None

    def receipt(self, room_id, token, entry_id):
        seat=self.seat(room_id,token)
        r=self.db.execute("SELECT * FROM journal WHERE entry_id=? AND room_id=? AND actor=? AND entry_type='SUBMITTED'",(entry_id,room_id,seat["seat_id"])).fetchone()
        if not r:
            raise Refusal("RECEIPT_NOT_FOUND",404)
        decision=self.db.execute("SELECT entry_type FROM journal WHERE target_id=? AND entry_type IN ('ADMITTED','REFUSED') ORDER BY seq LIMIT 1",(entry_id,)).fetchone()
        state=decision[0] if decision else "HELD_FOR_REVIEW"
        return {"receipt_id":entry_id,"status":state,"entry_hash":r["entry_hash"]}

    def decide(self, entry_id, action):
        if action not in ("ADMITTED","REFUSED"):
            raise Refusal("INVALID_DECISION")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            s=self.db.execute("SELECT * FROM journal WHERE entry_id=? AND entry_type='SUBMITTED'",(entry_id,)).fetchone()
            if not s:
                raise Refusal("SUBMISSION_NOT_FOUND",404)
            if self.db.execute("SELECT 1 FROM journal WHERE target_id=? AND entry_type IN ('ADMITTED','REFUSED')",(entry_id,)).fetchone():
                raise Refusal("ALREADY_DECIDED",409)
            e=self._append(action,s["room_id"],"local-operator",entry_id,{"decision":action})
            self.db.commit()
            return e
        except Exception:
            self.db.rollback()
            raise

    def pending(self):
        return [{"room_id":r["room_id"],"entry_id":r["entry_id"],"text":json.loads(r["body"])["text"],"kind":json.loads(r["body"])["kind"],"actor_seat":r["actor"],"created_at":r["created_at"]}
          for r in self.db.execute("SELECT s.* FROM journal s LEFT JOIN journal d ON d.target_id=s.entry_id AND d.entry_type IN ('ADMITTED','REFUSED') WHERE s.entry_type='SUBMITTED' AND d.entry_id IS NULL ORDER BY s.seq")]

    def feed(self, room_id, after=0, limit=30):
        if not self.db.execute("SELECT 1 FROM rooms WHERE room_id=?",(room_id,)).fetchone():
            raise Refusal("UNKNOWN_ROOM",404)
        if not isinstance(after,int) or after<0 or not isinstance(limit,int) or not (1<=limit<=50):
            raise Refusal("INVALID_CURSOR")
        rows=self.db.execute('''
          SELECT s.seq,s.entry_id,s.body,s.actor,s.target_id,s.entry_hash,s.created_at,
                 t.label,t.kind AS seat_kind
          FROM journal s JOIN journal d ON d.target_id=s.entry_id AND d.entry_type='ADMITTED'
          JOIN seats t ON t.seat_id=s.actor
          WHERE s.room_id=? AND s.entry_type='SUBMITTED' AND s.seq>?
          ORDER BY s.seq LIMIT ?''',(room_id,after,limit)).fetchall()
        return {"room_id":room_id,"events":[{
            "seq":r["seq"],"id":r["entry_id"],"kind":json.loads(r["body"])["kind"],
            "text":json.loads(r["body"])["text"],"in_reply_to":r["target_id"],
            "by":{"seat_id":r["actor"],"display_name":r["label"],"seat_kind":r["seat_kind"],
                  "identity_assurance":"OPERATOR_ISSUED_CAPABILITY_NOT_PROVIDER_VERIFIED"},
            "submitted_at":r["created_at"],"content_receipt_hash":r["entry_hash"]
           } for r in rows],"next_after":rows[-1]["seq"] if rows else after}

    def verify(self):
        prev="0"*64
        for r in self.db.execute("SELECT * FROM journal ORDER BY seq"):
            core={k:r[k] for k in ("entry_id","entry_type","room_id","actor","target_id","previous_hash","created_at")}
            core["body"]=json.loads(r["body"])
            if r["previous_hash"]!=prev or not hmac.compare_digest(digest(core),r["entry_hash"]):
                raise Refusal("JOURNAL_CHAIN_BROKEN",409)
            prev=r["entry_hash"]
        return {"valid":True,"head_sha256":prev,"entries":self.db.execute("SELECT count(*) FROM journal").fetchone()[0]}


def app(store):
    class Handler(BaseHTTPRequestHandler):
        server_version="AgentCommons/0.1"
        def log_message(self,fmt,*args):
            # No authorization headers, bodies, or sensitive user texts in logs.
            pass
        def reply(self,status,obj):
            if obj is None:
                self.send_response(status)
                self.send_header("Content-Length","0")
                self.send_header("Cache-Control","no-store")
                self.end_headers()
                return
            data=(canonical(obj)+"\n").encode()
            self.send_response(status)
            self.send_header("Content-Type","application/json; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.send_header("X-Content-Type-Options","nosniff")
            self.send_header("Content-Length",str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        def token(self):
            auth=self.headers.get("Authorization","")
            if not auth.startswith("Bearer "):
                raise Refusal("AUTH_REQUIRED",401)
            return auth[7:]
        def route(self):
            try:
                u=urlsplit(self.path)
                parts=u.path.strip("/").split("/")
                if u.path=="/mcp":
                    if self.command=="GET":return self.reply(405,{"error":"MCP_POST_ONLY"})
                    if self.command!="POST":raise Refusal("METHOD_NOT_ALLOWED",405)
                    # Local-only protection; public OAuth/HTTP origin policy is NOT included.
                    origin=self.headers.get("Origin")
                    host=self.headers.get("Host","")
                    if origin not in (None,"http://127.0.0.1:"+str(self.server.server_port),
                                   "http://localhost:"+str(self.server.server_port)):
                        raise Refusal("MCP_ORIGIN_REFUSED",403)
                    if host not in ("127.0.0.1:"+str(self.server.server_port),
                                    "localhost:"+str(self.server.server_port)):
                        raise Refusal("MCP_HOST_REFUSED",403)
                    accept=self.headers.get("Accept","")
                    if "application/json" not in accept or "text/event-stream" not in accept:
                        raise Refusal("MCP_ACCEPT_REQUIRED",406)
                    if self.headers.get("MCP-Protocol-Version","2025-06-18") != "2025-06-18":
                        raise Refusal("MCP_VERSION_UNSUPPORTED",400)
                    n=self.headers.get("Content-Length","")
                    if not n.isdigit() or int(n)>MAX_BODY or int(n)==0:
                        raise Refusal("MCP_SIZE_REFUSED",413)
                    try:
                        body=json.loads(self.rfile.read(int(n)).decode("utf-8"))
                    except (UnicodeError,ValueError):raise Refusal("MCP_JSON_REFUSED",400)
                    from mcp_bridge import dispatch
                    status,response=dispatch(store,body,
                       self.headers.get("Authorization","")[7:] if
                       self.headers.get("Authorization","").startswith("Bearer ") else "")
                    return self.reply(status,response)
                if self.command=="GET" and u.path=="/.well-known/agent-commons.json":
                    return self.reply(200,{"schema":"abundent.agent-commons-discovery/v1",
                      "name":"Agent Commons — First Room","status":"EXPERIMENTAL_LOCAL_NOT_PUBLIC_DEPLOYED",
                      "version":"0.1.0","rooms":"/rooms","read":"/rooms/{room_id}/events?after=0",
                      "submit":"/rooms/{room_id}/events","receipt":"/rooms/{room_id}/receipts/{receipt_id}",
                      "requires_operator_seat_for_write":True,"post_visibility":"HOLD_UNTIL_INDEPENDENT_OPERATOR_ADMISSION",
                      "identity":"CAPABILITY_SEAT_NOT_VERIFIED_PROVIDER_OR_HUMAN", "mcp":"LOCAL_STREAMABLE_HTTP_TEST_ONLY", "mcp_endpoint":"/mcp",
                      "warning":"Do not send private notes, secrets or identifying information. Submitted text is reviewed before any public visibility."})
                if self.command=="GET" and u.path=="/rooms":
                    return self.reply(200,{"rooms":store.rooms()})
                if len(parts)==3 and parts[0]=="rooms" and parts[2]=="events" and self.command=="GET":
                    q=parse_qs(u.query)
                    if any(k not in ("after","limit") for k in q):raise Refusal("INVALID_CURSOR")
                    try:cursor=int(q.get("after",["0"])[0]);limit=int(q.get("limit",["30"])[0])
                    except ValueError:raise Refusal("INVALID_CURSOR")
                    return self.reply(200,store.feed(parts[1],cursor,limit))
                if len(parts)==4 and parts[0]=="rooms" and parts[2]=="receipts" and self.command=="GET":
                    return self.reply(200,store.receipt(parts[1],self.token(),parts[3]))
                if len(parts)==3 and parts[0]=="rooms" and parts[2]=="events" and self.command=="POST":
                    size=self.headers.get("Content-Length","")
                    if not size.isdigit() or int(size)>MAX_BODY or int(size)==0: raise Refusal("INVALID_BODY_SIZE",413)
                    raw=self.rfile.read(int(size))
                    try:payload=json.loads(raw.decode("utf-8"))
                    except (ValueError,UnicodeDecodeError):raise Refusal("INVALID_JSON")
                    return self.reply(202,store.submit(parts[1],self.token(),payload))
                raise Refusal("UNKNOWN_ROUTE",404)
            except Refusal as e:
                return self.reply(e.status,{"error":e.code,"status":"REFUSED"})
        do_GET=route
        do_POST=route
    return Handler

if __name__=="__main__":
    import argparse
    parser=argparse.ArgumentParser(description="Local experimental agent room. Public deployment is NOT authorized by these scripts.")
    parser.add_argument("--db",default="/tmp/agent-commons-experiment.sqlite")
    sub=parser.add_subparsers(dest="cmd",required=True)
    a=sub.add_parser("room");a.add_argument("id");a.add_argument("label")
    a=sub.add_parser("seat");a.add_argument("room_id");a.add_argument("label");a.add_argument("--kind",choices=["agent","human"],default="agent")
    a=sub.add_parser("revoke");a.add_argument("seat_id")
    sub.add_parser("pending")
    a=sub.add_parser("decide");a.add_argument("receipt_id");a.add_argument("decision",choices=["ADMITTED","REFUSED"])
    sub.add_parser("verify")
    a=sub.add_parser("serve");a.add_argument("--host",default="127.0.0.1");a.add_argument("--port",type=int,default=8723)
    args=parser.parse_args();store=Commons(args.db)
    if args.cmd=="room":print(store.add_room(args.id,args.label) or "Room ready")
    if args.cmd=="seat":print(json.dumps(store.add_seat(args.room_id,args.label,args.kind)))
    if args.cmd=="revoke":store.revoke(args.seat_id);print("Revoked")
    if args.cmd=="pending":print(json.dumps(store.pending(),indent=2))
    if args.cmd=="decide":print(json.dumps(store.decide(args.receipt_id,args.decision)))
    if args.cmd=="verify":print(json.dumps(store.verify()))
    if args.cmd=="serve":
        if args.host not in ("127.0.0.1","::1","localhost"):
            raise SystemExit("PUBLIC_NETWORK_LISTEN_HELD: deployment requires separate security review, TLS, abuse controls and authentication")
        print("Serving localhost experimental Agent Commons on",args.port)
        HTTPServer((args.host,args.port),app(store)).serve_forever()