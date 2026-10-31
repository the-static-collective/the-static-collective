"""Real ac014/ac015 SQL on an explicitly disposable local PostgreSQL database.

Never uses Supabase credentials. CI provides a fresh commons_017_test database.
"""
import hashlib
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psycopg
from psycopg.conninfo import conninfo_to_dict
import pytest

MIGRATIONS = Path(__file__).resolve().parents[1] / 'hosted/supabase/migrations'


@pytest.fixture(scope='module')
def database():
    dsn = os.getenv('COMMONS_TEST_DATABASE_URL')
    if not dsn:
        pytest.skip('Set COMMONS_TEST_DATABASE_URL for disposable local SQL proof')
    options = conninfo_to_dict(dsn)
    assert options.get('host') in ('127.0.0.1', 'localhost')
    assert options.get('dbname', '').startswith('commons_017_test')
    with psycopg.connect(dsn, autocommit=True) as db:
        for role in ('anon', 'authenticated', 'service_role'):
            if not db.execute('SELECT 1 FROM pg_roles WHERE rolname=%s', (role,)).fetchone():
                db.execute('CREATE ROLE ' + role)
        # Supabase's service_role bypasses RLS; ordinary callers do not.
        db.execute('ALTER ROLE service_role BYPASSRLS')
        for name in ('20261031_ac014_hosted_room.sql', '20261031_ac015_party_claims.sql'):
            db.execute((MIGRATIONS / name).read_text())
    return dsn


@pytest.fixture()
def clean_db(database):
    with psycopg.connect(database, autocommit=True) as db:
        db.execute('TRUNCATE ac015_party_claims, ac014_decisions, ac014_messages, ac014_seats, ac014_rooms CASCADE')
        db.execute("INSERT INTO ac014_rooms(room_id,title,visible) VALUES ('first-table','Synthetic test room',true)")
    return database


def add_seat(dsn, number=0, provider='groq'):
    token_hash = hashlib.sha256(f'synthetic-test-token-{number}'.encode()).hexdigest()
    with psycopg.connect(dsn, autocommit=True) as db:
        db.execute("INSERT INTO ac014_seats(room_id,label,kind,token_sha256) VALUES ('first-table',%s,'agent',%s)",
                   ('Commons provider: ' + provider, token_hash))
    return token_hash


def claim(dsn, token_hash, context, provider='groq'):
    with psycopg.connect(dsn, autocommit=True) as db:
        db.execute('SET ROLE service_role')
        try:
            return db.execute("SELECT ac015_claim(%s,'first-table',%s,%s)",
                              (token_hash, provider, hashlib.sha256(context.encode()).hexdigest())).fetchone()[0]
        except psycopg.Error as error:
            return str(error).splitlines()[0]


@pytest.mark.parametrize('same_context,expected', [(False, 2), (True, 1)])
def test_atomic_seat_limit_and_duplicate_claim_under_concurrency(clean_db, same_context, expected):
    token_hash = add_seat(clean_db)
    with ThreadPoolExecutor(max_workers=12) as workers:
        results = list(workers.map(lambda n: claim(clean_db, token_hash, 'same' if same_context else str(n)), range(12)))
    accepted = [r for r in results if isinstance(r, dict)]
    assert len(accepted) == expected
    assert all(r['status'] == 'CLAIMED_ONE_ATTEMPT' for r in accepted)
    assert all(isinstance(r, dict) or r == ('ALREADY_CLAIMED_NO_RETRY' if same_context else 'PROVIDER_DAILY_LIMIT') for r in results)


def test_atomic_global_limit_and_scope_rejection(clean_db):
    seats = [add_seat(clean_db, n) for n in range(12)]
    assert claim(clean_db, seats[0], 'wrong-provider', 'gemini') == 'WRONG_PROVIDER_SEAT'
    with ThreadPoolExecutor(max_workers=12) as workers:
        results = list(workers.map(lambda seat: claim(clean_db, seat, 'global'), seats))
    assert len([r for r in results if isinstance(r, dict)]) == 6
    assert all(isinstance(r, dict) or r == 'GLOBAL_DAILY_LIMIT' for r in results)
    with psycopg.connect(clean_db, autocommit=True) as db:
        assert db.execute('SELECT count(*) FROM ac015_party_claims').fetchone()[0] == 6
        db.execute('UPDATE ac014_seats SET revoked_at=now() WHERE token_sha256=%s', (seats[0],))
    assert claim(clean_db, seats[0], 'revoked') == 'AUTH_REQUIRED'


def test_held_submission_is_private_until_independent_human_decision(clean_db):
    token_hash = add_seat(clean_db)
    attempt = claim(clean_db, token_hash, 'held-output')
    body = 'Synthetic provider output awaiting a separate human admission.'
    with psycopg.connect(clean_db, autocommit=True) as db:
        db.execute('SET ROLE service_role')
        receipt = db.execute("SELECT ac014_submit('first-table',%s,'idea',%s,NULL,'synthetic-held-idempotency',%s)",
                             (token_hash, body, hashlib.sha256(body.encode()).hexdigest())).fetchone()[0]
        assert receipt['status'] == 'HELD_FOR_REVIEW'
        finished = db.execute("SELECT ac015_finish(%s,%s,'HELD_SUBMITTED',%s)",
                              (token_hash, attempt['claim_id'], receipt['receipt_id'])).fetchone()[0]
        assert finished['status'] == 'HELD_SUBMITTED' and finished['publicly_admitted'] is False
        visible = "SELECT body FROM ac014_messages m JOIN ac014_decisions d USING(message_id) WHERE d.decision='ADMITTED'"
        assert db.execute(visible).fetchall() == []
        db.execute('RESET ROLE')
        db.execute("INSERT INTO ac014_decisions(message_id,decision,reviewed_by) VALUES (%s,'ADMITTED','synthetic-human-operator')",
                   (receipt['receipt_id'],))
        assert db.execute(visible).fetchone()[0] == body
        db.execute('SET ROLE anon')
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            db.execute('SELECT * FROM ac014_messages')
