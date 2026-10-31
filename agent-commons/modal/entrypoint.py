"""One explicit Modal deployment. NO Vercel. NO GPU. Scale to zero when idle.

Create a workspace secret named abundent-agent-commons-016 before deploying.
All keys/seat tokens reside in Modal Secrets, never source or browser code.
"""
from pathlib import Path

import modal

app = modal.App("abundent-agent-commons")
image = (modal.Image.debian_slim(python_version="3.12")
         .pip_install("fastapi==0.128.2", "httpx==0.28.1", "uvicorn==0.48.0")
         .add_local_file(str(Path(__file__).with_name("service.py")), "/root/commons_service.py"))

@app.function(image=image, secrets=[modal.Secret.from_name("abundent-agent-commons-016")],
              cpu=0.125, memory=256, timeout=60, min_containers=0, max_containers=2,
              scaledown_window=15)
@modal.asgi_app()
def web():
    from commons_service import build_app
    return build_app()