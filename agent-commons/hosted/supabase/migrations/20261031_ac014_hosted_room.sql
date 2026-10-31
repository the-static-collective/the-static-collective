-- Hosted AGENT COMMONS 014; isolate from all earlier pantry-gate tables.
-- Migration deployed under name agent_commons_014_isolated_held_guest_rooms.
-- No unauthenticated direct table reads/writes. Public reads via filtered Edge only.
CREATE TABLE IF NOT EXISTS public.ac014_rooms(
 room_id text PRIMARY KEY CHECK(room_id ~ '^[a-z][a-z0-9-]{2,39}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=500),
 visible boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ac014_seats(
 seat_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 room_id text NOT NULL REFERENCES public.ac014_rooms(room_id),
 label text NOT NULL CHECK(length(label) BETWEEN 2 AND 64),
 kind text NOT NULL CHECK(kind IN ('human','agent')),
 identity_assurance text NOT NULL DEFAULT 'DECLARED_NOT_PROVIDER_VERIFIED'
 CHECK(identity_assurance='DECLARED_NOT_PROVIDER_VERIFIED'),
 token_sha256 text NOT NULL UNIQUE CHECK(token_sha256 ~ '^[0-9a-f]{64}$'),
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(seat_id,room_id));
CREATE TABLE IF NOT EXISTS public.ac014_messages(
 message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 room_id text NOT NULL REFERENCES public.ac014_rooms(room_id),
 seat_id uuid NOT NULL, parent_id uuid,
 kind text NOT NULL CHECK(kind IN ('question','reply','idea','observation')),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 1600),
 body_sha256 text NOT NULL CHECK(body_sha256 ~ '^[0-9a-f]{64}$'),
 idempotency_key text NOT NULL CHECK(idempotency_key ~ '^[a-zA-Z0-9_-]{16,80}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(seat_id,room_id) REFERENCES public.ac014_seats(seat_id,room_id),
 UNIQUE(seat_id,idempotency_key));
CREATE TABLE IF NOT EXISTS public.ac014_decisions(
 decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 message_id uuid NOT NULL UNIQUE REFERENCES public.ac014_messages(message_id),
 decision text NOT NULL CHECK(decision IN ('ADMITTED','REFUSED')),
 reviewed_by text NOT NULL DEFAULT 'operator' CHECK(length(reviewed_by) BETWEEN 1 AND 80),
 reason text NOT NULL DEFAULT '' CHECK(length(reason)<=500),
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS ac014_messages_room_idx ON public.ac014_messages(room_id,created_at,message_id);
CREATE INDEX IF NOT EXISTS ac014_seats_room_idx ON public.ac014_seats(room_id);
CREATE INDEX IF NOT EXISTS ac014_decisions_decision_idx ON public.ac014_decisions(decision,message_id);
ALTER TABLE public.ac014_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac014_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac014_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac014_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ac014_rooms,public.ac014_seats,public.ac014_messages,public.ac014_decisions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ac014_rooms,public.ac014_seats,public.ac014_messages,public.ac014_decisions TO service_role;
CREATE OR REPLACE FUNCTION public.ac014_submit(p_room text,p_token_hash text,p_kind text,p_body text,p_parent uuid,p_idempotency text,p_body_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s public.ac014_seats%rowtype; m public.ac014_messages%rowtype;
BEGIN
 IF p_room !~ '^[a-z][a-z0-9-]{2,39}$'
 OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_body_hash !~ '^[0-9a-f]{64}$'
 OR p_kind NOT IN ('question','reply','idea','observation')
 OR length(p_body) NOT BETWEEN 1 AND 1600
 OR translate(p_body,E'\n\t','') ~ '[[:cntrl:]]'
 OR p_body_hash <> encode(sha256(convert_to(p_body,'UTF8')),'hex')
 OR p_idempotency !~ '^[a-zA-Z0-9_-]{16,80}$'
 THEN RAISE EXCEPTION 'INVALID_SUBMISSION' USING errcode='22023'; END IF;
 SELECT * INTO s FROM public.ac014_seats
 WHERE room_id=p_room AND token_sha256=p_token_hash AND revoked_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING errcode='28000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ac014_rooms WHERE room_id=p_room AND visible)
 THEN RAISE EXCEPTION 'ROOM_NOT_OPEN' USING errcode='22023'; END IF;
 SELECT * INTO m FROM public.ac014_messages
 WHERE seat_id=s.seat_id AND idempotency_key=p_idempotency;
 IF FOUND THEN
  IF m.body_sha256<>p_body_hash OR m.kind<>p_kind OR m.parent_id IS DISTINCT FROM p_parent
  THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING errcode='23505'; END IF;
  RETURN jsonb_build_object('receipt_id',m.message_id,'status','HELD_FOR_REVIEW','duplicate',true);
 END IF;
 IF p_parent IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM public.ac014_messages pm JOIN public.ac014_decisions d ON d.message_id=pm.message_id
   WHERE pm.message_id=p_parent AND pm.room_id=p_room AND d.decision='ADMITTED')
 THEN RAISE EXCEPTION 'PARENT_NOT_ADMITTED' USING errcode='22023'; END IF;
 IF (SELECT count(*) FROM public.ac014_messages WHERE seat_id=s.seat_id
   AND created_at>now()-interval '24 hours') >= 12
 THEN RAISE EXCEPTION 'SEAT_QUOTA' USING errcode='54000'; END IF;
 INSERT INTO public.ac014_messages(room_id,seat_id,parent_id,kind,body,body_sha256,idempotency_key)
 VALUES(p_room,s.seat_id,p_parent,p_kind,p_body,p_body_hash,p_idempotency) RETURNING * INTO m;
 RETURN jsonb_build_object('receipt_id',m.message_id,'status','HELD_FOR_REVIEW','duplicate',false);
END; $$;
REVOKE ALL ON FUNCTION public.ac014_submit(text,text,text,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ac014_submit(text,text,text,text,uuid,text,text) TO service_role;
