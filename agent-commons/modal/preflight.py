"""Read-only Modal metadata checks. Never deploys, invokes functions or reads secret values."""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

MANIFEST = Path(__file__).with_name('operator-manifest.json')


def validate_manifest(manifest: dict) -> None:
    resources = manifest['resources']
    if (manifest['schema'] != 'agent-commons/operator-017'
            or resources != {'cpu': 0.125, 'memory': 256, 'gpu': None,
                             'min_containers': 0, 'max_containers': 2, 'buffer_containers': 0,
                             'scaledown_window': 15, 'timeout': 120, 'retries': 0, 'schedule': None}):
        raise ValueError('MANIFEST_RESOURCE_POLICY_INVALID')


def manifest() -> dict:
    data = json.loads(MANIFEST.read_text())
    validate_manifest(data)
    return data


def reviewed_ref(ref: str, actual_sha: str, expected_sha: str) -> bool:
    return (ref == 'refs/heads/' + manifest()['source_branch']
            and re.fullmatch(r'[a-f0-9]{40}', expected_sha) is not None
            and actual_sha == expected_sha)


def check_modal(*, environment: str, profile_auth: bool = False) -> dict:
    import modal
    data = manifest()
    report = {'status': 'BLOCKED_ON_USER_SECRET', 'deployment': 'NOT_EXECUTED',
              'environment': environment, 'secret': data['modal_secret'],
              'seatAuthorization': 'UNVERIFIED', 'providerBilling': 'UNVERIFIED',
              'providerCalls': 0, 'secretValuesRead': False}
    missing = [key for key in data['deployment_auth'] if not os.environ.get(key)]
    if missing and not profile_auth:
        return {**report, 'reason': 'MODAL_DEPLOYMENT_TOKENS_MISSING', 'missing': missing}
    try:
        client = modal.Client.from_env()
        def check_keys(keys=()):
            modal.Secret.from_name(data['modal_secret'], environment_name=environment,
                                   required_keys=list(keys), client=client).hydrate()
        check_keys()
    except modal.exception.AuthError:
        return {**report, 'reason': 'MODAL_AUTH_REJECTED'}
    except modal.exception.NotFoundError:
        return {**report, 'reason': 'MODAL_SECRET_MISSING'}
    except modal.exception.PermissionDeniedError:
        return {**report, 'reason': 'MODAL_PERMISSION_DENIED'}
    except Exception:
        # Never print exception messages: SDK errors can contain sensitive context.
        return {**report, 'reason': 'MODAL_READINESS_UNAVAILABLE'}

    def has_key(key):
        try:
            check_keys([key])
            return True
        except (modal.exception.NotFoundError, modal.exception.InvalidError):
            # Missing-key assertions can be reported as lookup or validation errors.
            # Treat both as unconfigured; never print SDK text or assume authorization.
            return False
    try:
        operator = has_key(data['operator_auth'])
        providers = {}
        for name, config in data['providers'].items():
            required = [[config['seat']], *config['keys']]
            absent = [group for group in required if not any(has_key(key) for key in group)]
            providers[name] = {'configured': not absent, 'missing_key_alternatives': absent}
    except Exception:
        return {**report, 'reason': 'MODAL_KEY_METADATA_UNAVAILABLE'}
    return {**report, 'status': 'TESTED', 'reason': 'MODAL_AUTH_AND_SECRET_METADATA_VERIFIED',
            'operatorKeyPresent': operator, 'providers': providers,
            'note': 'Presence only; values, token scope, quota availability and billing are unverified.'}


def deployed_url(environment: str) -> str:
    import modal
    data = manifest()
    url = modal.Function.from_name(data['app'], data['function'], environment_name=environment).get_web_url()
    if not url or not re.fullmatch(r'https://[a-zA-Z0-9-]+\.modal\.run', url):
        raise ValueError('MODAL_URL_UNAVAILABLE')
    return url


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--modal', action='store_true', help='Read auth + named Secret/key metadata only')
    parser.add_argument('--environment', default='main', help='Use the same environment for deploy')
    parser.add_argument('--profile-auth', action='store_true', help='Use the profile created by modal setup')
    parser.add_argument('--url', action='store_true', help='Look up deployed URL without invoking the function')
    parser.add_argument('--reviewed-sha', help='Require GITHUB_REF/GITHUB_SHA to match this reviewed commit')
    args = parser.parse_args()
    try:
        data = manifest()
        if args.reviewed_sha is not None and not reviewed_ref(os.getenv('GITHUB_REF', ''), os.getenv('GITHUB_SHA', ''), args.reviewed_sha):
            print(json.dumps({'status': 'HOLD', 'reason': 'REVIEWED_SOURCE_REF_MISMATCH'}))
            return 2
        if args.url:
            print(deployed_url(args.environment))
            return 0
        report = check_modal(environment=args.environment, profile_auth=args.profile_auth) if args.modal else {
            'status': 'TESTED', 'scope': 'LOCAL_MANIFEST_ONLY', 'app': data['app'],
            'deployment': 'NOT_EXECUTED', 'providerCalls': 0}
        print(json.dumps(report, indent=2))
        return 0 if report['status'] == 'TESTED' else 3
    except Exception:
        print(json.dumps({'status': 'HOLD', 'reason': 'PREFLIGHT_OR_URL_UNAVAILABLE'}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
