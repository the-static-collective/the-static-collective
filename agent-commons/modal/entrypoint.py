"""One explicit Modal deployment. NO Vercel. NO GPU. Scale to zero when idle.

Create a workspace secret named abundent-agent-commons-016 before deploying.
All keys/seat tokens reside in Modal Secrets, never source or browser code.
"""
from pathlib import Path

import json

import modal

config = json.loads(Path(__file__).with_name("operator-manifest.json").read_text())

app = modal.App(config["app"])
image = (modal.Image.debian_slim(python_version="3.12")
         .pip_install_from_requirements(str(Path(__file__).with_name("requirements.txt")))
         .add_local_file(str(Path(__file__).with_name("service.py")), "/root/commons_service.py")
         .add_local_file(str(Path(__file__).with_name("operator-manifest.json")), "/root/operator-manifest.json")
         .add_local_file(str(Path(__file__).with_name("requirements.txt")), "/root/requirements.txt"))

@app.function(image=image, secrets=[modal.Secret.from_name(config["modal_secret"])],
              # ASGI functions reject the retries argument; HTTP calls never retry.
              **{key: value for key, value in config["resources"].items() if key != "retries"})
@modal.asgi_app()
def web():
    from commons_service import build_app
    return build_app()
