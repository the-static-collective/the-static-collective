"""Deployment tooling tests: metadata only, no Modal function invocation."""
import importlib.util
import json
import os
import runpy
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import modal
import pytest

ROOT = Path(__file__).resolve().parents[1] / 'modal'


def load_preflight():
    path = ROOT / 'preflight.py'
    assert path.exists(), 'read-only preflight is missing'
    spec = importlib.util.spec_from_file_location('commons_preflight', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_missing_deployment_tokens_are_named_without_values():
    preflight = load_preflight()
    with patch.dict(os.environ, {}, clear=True):
        report = preflight.check_modal(environment='main')
    assert report['status'] == 'BLOCKED_ON_USER_SECRET'
    assert report['missing'] == ['MODAL_TOKEN_ID', 'MODAL_TOKEN_SECRET']


@pytest.mark.parametrize('missing_error', [modal.exception.NotFoundError, modal.exception.InvalidError])
def test_secret_lookup_only_uses_metadata_and_key_assertions(monkeypatch, missing_error):
    preflight = load_preflight()
    lookups = []
    class Handle:
        def hydrate(self):
            return self
    def lookup(name, **kwargs):
        lookups.append((name, kwargs))
        if kwargs.get('required_keys') == ['COMMONS_GROQ_SEAT_TOKEN']:
            raise missing_error('SECRET_VALUE_MUST_NOT_ESCAPE')
        return Handle()
    monkeypatch.setattr(modal.Secret, 'from_name', lookup)
    monkeypatch.setattr(modal.Client, 'from_env', lambda: object())
    with patch.dict(os.environ, {'MODAL_TOKEN_ID':'fake-id', 'MODAL_TOKEN_SECRET':'fake-private'}, clear=True):
        report = preflight.check_modal(environment='main')
    assert report['status'] == 'TESTED'
    assert report['providers']['groq']['configured'] is False
    assert report['providers']['gemini']['configured'] is True
    assert report['seatAuthorization'] == 'UNVERIFIED'
    assert all(name == 'abundent-agent-commons-016' for name, _ in lookups)
    assert all(kw['environment_name'] == 'main' for _, kw in lookups)
    assert 'fake-private' not in json.dumps(report)
    assert 'SECRET_VALUE_MUST_NOT_ESCAPE' not in json.dumps(report)


@pytest.mark.parametrize('error,reason', [
    (modal.exception.AuthError('private'), 'MODAL_AUTH_REJECTED'),
    (modal.exception.NotFoundError('private'), 'MODAL_SECRET_MISSING'),
    (RuntimeError('private'), 'MODAL_READINESS_UNAVAILABLE'),
])
def test_modal_errors_are_sanitized(monkeypatch, error, reason):
    preflight = load_preflight()
    monkeypatch.setattr(modal.Client, 'from_env', lambda: object())
    def fail(*args, **kwargs):
        raise error
    monkeypatch.setattr(modal.Secret, 'from_name', fail)
    with patch.dict(os.environ, {'MODAL_TOKEN_ID':'fake', 'MODAL_TOKEN_SECRET':'fake'}, clear=True):
        report = preflight.check_modal(environment='main')
    assert report['reason'] == reason
    assert 'private' not in json.dumps(report)


def test_manifest_rejects_gpu_or_nonzero_idle_capacity():
    preflight = load_preflight()
    manifest = json.loads((ROOT / 'operator-manifest.json').read_text())
    preflight.validate_manifest(manifest)
    for key, value in [('gpu', 'A10G'), ('min_containers', 1), ('schedule', 'daily')]:
        bad = {**manifest, 'resources': {**manifest['resources'], key: value}}
        with pytest.raises(ValueError):
            preflight.validate_manifest(bad)


def test_reviewed_ref_gate_rejects_default_branch_and_sha_mismatch():
    preflight = load_preflight()
    sha = 'a' * 40
    assert preflight.reviewed_ref('refs/heads/feature/modal-vercel-exit-016', sha, sha)
    assert not preflight.reviewed_ref('refs/heads/main', sha, sha)
    assert not preflight.reviewed_ref('refs/heads/feature/modal-vercel-exit-016', sha, 'b' * 40)
    assert not preflight.reviewed_ref('refs/pull/13/merge', sha, sha)


def test_url_discovery_does_not_invoke_function(monkeypatch):
    preflight = load_preflight()
    class Function:
        def get_web_url(self):
            return 'https://fixture--commons-web.modal.run'
    monkeypatch.setattr(modal.Function, 'from_name', lambda *a, **kw: Function())
    assert preflight.deployed_url('main') == 'https://fixture--commons-web.modal.run'


def test_sdk_import_constructs_cpu_only_service_offline():
    entry = runpy.run_path(str(ROOT / 'entrypoint.py'))
    spec = entry['web']._spec_
    assert spec.gpus is None
    assert spec.cpu == 0.125
    assert spec.memory == 256
    assert entry['app'].name == 'abundent-agent-commons'


def test_empty_reviewed_sha_cannot_bypass_dispatch_gate():
    result = subprocess.run([sys.executable, str(ROOT / 'preflight.py'), '--reviewed-sha', ''],
                            env={**os.environ, 'GITHUB_REF':'refs/heads/main', 'GITHUB_SHA':'a'*40},
                            capture_output=True, text=True)
    assert result.returncode == 2
    assert json.loads(result.stdout)['reason'] == 'REVIEWED_SOURCE_REF_MISMATCH'


def test_sdk_packaged_files_support_relocated_container_import(tmp_path):
    import shutil
    entry = runpy.run_path(str(ROOT / 'entrypoint.py'))
    visited = set()
    def copy_mounts(obj):
        if id(obj) in visited:
            return
        visited.add(id(obj))
        for item in getattr(obj, '_entries', ()) or ():
            if hasattr(item, 'local_file'):
                target = tmp_path / str(item.remote_path).removeprefix('/root/')
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(item.local_file, target)
        deps = getattr(obj, '_deps', None)
        for dep in deps() if deps else ():
            copy_mounts(dep)
    copy_mounts(entry['web']._spec_.image)
    for mount in entry['web']._spec_.mounts:
        copy_mounts(mount)
    result = subprocess.run([sys.executable, '-c',
                             "import entrypoint; from commons_service import build_app; assert build_app().title == 'Abundent Independent Commons'"],
                            cwd=tmp_path, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
