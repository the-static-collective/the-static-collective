-- Source captured from deployed database at AC015; no token keys in repo.
CREATE TABLE IF NOT EXISTS public.ac015_party_claims (
 claim_id uuid primary key default gen_random_uuid(),
 seat_id uuid not null references public.ac014_seats(seat_id),
 room_id text not null references public.ac014_rooms(room_id),
 provider text not null check(provider in ('groq','gemini','openrouter','cloudflare-nemotron')),
 context_sha256 text not null check(context_sha256 ~ '^[0-9a-f]{64}$'),
 status text not null default 'CLAIMED' check(status in ('CLAIMED','HELD_SUBMITTED','PROVIDER_HOLD','SUBMISSION_HOLD')),
 message_id uuid references public.ac014_messages(message_id),
 created_at timestamptz not null default now(),
 closed_at timestamptz,
 unique(seat_id,context_sha256,provider)
);
CREATE INDEX IF NOT EXISTS ac015_claims_seat_time_idx ON public.ac015_party_claims(seat_id,created_at);
ALTER TABLE public.ac015_party_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ac015_party_claims FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ac015_party_claims TO service_role;
CREATE OR REPLACE FUNCTION public.ac015_claim(p_token_hash text, p_room text, p_provider text, p_context_sha256 text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s public.ac014_seats%rowtype; c public.ac015_party_claims%rowtype;
begin
 if p_token_hash !~ '^[0-9a-f]{64}$' or p_context_sha256 !~ '^[0-9a-f]{64}$'
  or p_room <> 'first-table'
  or p_provider not in ('groq','gemini','openrouter','cloudflare-nemotron')
 then raise exception 'INVALID_CLAIM' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtext('ac015:global'));
 select * into s from public.ac014_seats where token_sha256=p_token_hash
  and room_id=p_room and kind='agent' and revoked_at is null for update;
 if not found then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
 if s.label <> ('Commons provider: '||p_provider)
  then raise exception 'WRONG_PROVIDER_SEAT' using errcode='28000'; end if;
 if not exists(select 1 from public.ac014_rooms where room_id=p_room and visible)
  then raise exception 'ROOM_NOT_OPEN' using errcode='22023'; end if;
 if exists(select 1 from public.ac015_party_claims where seat_id=s.seat_id
  and provider=p_provider and context_sha256=p_context_sha256)
 then raise exception 'ALREADY_CLAIMED_NO_RETRY' using errcode='23505'; end if;
 if (select count(*) from public.ac015_party_claims where seat_id=s.seat_id
  and created_at>now()-interval '24 hours') >= 2
 then raise exception 'PROVIDER_DAILY_LIMIT' using errcode='54000'; end if;
 if (select count(*) from public.ac015_party_claims
  where created_at>now()-interval '24 hours') >= 6
 then raise exception 'GLOBAL_DAILY_LIMIT' using errcode='54000'; end if;
 insert into public.ac015_party_claims(seat_id,room_id,provider,context_sha256)
 values(s.seat_id,p_room,p_provider,p_context_sha256) returning * into c;
 return jsonb_build_object('claim_id',c.claim_id,'status','CLAIMED_ONE_ATTEMPT','daily_limit',2);
end; $function$
;
CREATE OR REPLACE FUNCTION public.ac015_finish(p_token_hash text, p_claim uuid, p_status text, p_message uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s public.ac014_seats%rowtype; c public.ac015_party_claims%rowtype;
begin
 if p_token_hash !~ '^[0-9a-f]{64}$' or p_status not in
  ('HELD_SUBMITTED','PROVIDER_HOLD','SUBMISSION_HOLD') then
  raise exception 'INVALID_FINISH' using errcode='22023'; end if;
 select * into s from public.ac014_seats where token_sha256=p_token_hash
  and kind='agent' and revoked_at is null;
 if not found then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
 select * into c from public.ac015_party_claims where claim_id=p_claim
  and seat_id=s.seat_id for update;
 if not found then raise exception 'CLAIM_NOT_FOUND' using errcode='22023'; end if;
 if c.status <> 'CLAIMED' then raise exception 'FINISHED_NO_RETRY' using errcode='23505'; end if;
 if (p_status='HELD_SUBMITTED') is distinct from (p_message is not null) then
  raise exception 'MESSAGE_REQUIRED' using errcode='22023'; end if;
 if p_message is not null and not exists(
  select 1 from public.ac014_messages where message_id=p_message
    and seat_id=s.seat_id and room_id=c.room_id)
 then raise exception 'WRONG_SEAT_MESSAGE' using errcode='22023'; end if;
 update public.ac015_party_claims set status=p_status,message_id=p_message,closed_at=now()
  where claim_id=p_claim;
 return jsonb_build_object('claim_id',p_claim,'status',p_status,'publicly_admitted',false);
end; $function$
;
REVOKE ALL ON FUNCTION public.ac015_claim(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ac015_claim(text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.ac015_finish(text,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ac015_finish(text,uuid,text,uuid) TO service_role;
