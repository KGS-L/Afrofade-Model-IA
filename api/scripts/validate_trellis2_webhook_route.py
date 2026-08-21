#!/usr/bin/env python3
"""Executable FastAPI route checks for the public signed FAL callback."""
import base64, hashlib, json, os, sys, time
from types import SimpleNamespace
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
sys.modules.setdefault("cv2",SimpleNamespace())  # Route test never executes image quality code.
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
import main
import services.hair.fal_webhook as webhook
from services.jobs.job_queue import JobQueueError
JOB="11111111-1111-4111-8111-111111111111"
private=Ed25519PrivateKey.generate(); public=private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)
b64=lambda value:base64.urlsafe_b64encode(value).decode().rstrip("=")
class Queue:
 def __init__(self,result=True,error=None):self.result=result;self.error=error;self.calls=[]
 def accept_trellis2_webhook(self,*args):
  self.calls.append(args)
  if self.error:raise self.error
  return self.result
def signed(body,now=None):
 now=int(time.time()) if now is None else now; request_id="fal-1"; digest=hashlib.sha256(body).hexdigest()
 signature=private.sign(f"{request_id}\nuser\n{now}\n{digest}".encode()).hex()
 return {"X-Fal-Webhook-Request-Id":request_id,"X-Fal-Webhook-User-Id":"user","X-Fal-Webhook-Timestamp":str(now),"X-Fal-Webhook-Signature":signature,"Content-Type":"application/json"}
def call(queue,body,headers):
 main.get_persistent_job_queue=lambda:queue
 return TestClient(main.app).post(f"/webhooks/fal/trellis2/{JOB}",content=body,headers=headers)
def main_test():
 os.environ.pop("API_INTERNAL_SECRET",None); os.environ["FAL_WEBHOOK_MAX_BYTES"]="256"
 webhook._cache=(int(time.time())-1,{"keys":[{"x":b64(public)}]})
 webhook.requests=SimpleNamespace(get=lambda *a,**k:(_ for _ in ()).throw(RuntimeError("offline")))
 body=b'{"request_id":"fal-1","status":"OK"}'; q=Queue(); response=call(q,body,signed(body)); assert response.status_code==200 and q.calls,(response.status_code,response.text)
 assert call(Queue(False),body,signed(body)).status_code==200
 bad=signed(body);bad["X-Fal-Webhook-Signature"]="00"*64;assert call(Queue(),body,bad).status_code==401
 assert call(Queue(),body,signed(body,int(time.time())-301)).status_code==401
 large=b'{"request_id":"fal-1","x":"'+b"x"*300+b'"}';assert call(Queue(),large,signed(large)).status_code==413
 assert call(Queue(error=JobQueueError("fal_request_id_conflict")),body,signed(body)).status_code==409
 assert call(Queue(error=JobQueueError("network")),body,signed(body)).status_code==503
 print("TRELLIS.2 webhook route: PASS")
if __name__=="__main__":main_test()
