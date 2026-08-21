#!/usr/bin/env python3
"""Offline Story 8.4 contract checks; never contacts FAL."""
import base64, hashlib, json, sys, time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from services.hair.trellis2_provider import Trellis2HairProvider, FalProviderError
import services.hair.fal_webhook as webhook

class Response:
 def __init__(self,status,payload,headers=None): self.status_code=status; self._payload=payload; self.text=json.dumps(payload); self.headers=headers or {}
 def json(self): return self._payload
 def raise_for_status(self):
  if self.status_code>=400: raise RuntimeError(self.status_code)
class Transport:
 def __init__(self,responses): self.responses=list(responses); self.calls=[]
 def request(self,method,url,**kw): self.calls.append((method,url,kw)); return self.responses.pop(0)
 def get(self,url,**kw): return self.responses.pop(0)
class Clock:
 def __init__(self): self.value=0.0
 def now(self): return self.value
 def sleep(self,seconds): self.value += seconds

def main():
 t=Transport([Response(200,{"request_id":"fal-1"}),Response(200,{"status":"COMPLETED"}),Response(200,{"model_glb":{"url":"https://cdn/x.glb"}})])
 p=Trellis2HairProvider(api_key="secret",enabled=True,webhook_url="https://api/webhooks/fal/trellis2",loras={"sparse_structure":"https://private/sparse","geometry":"https://private/geo","texture":"https://private/tex"},required_lora_stages=("sparse_structure","geometry","texture"),transport=t)
 internal="11111111-1111-4111-8111-111111111111"
 job=p.submit({"image_url":"https://cdn/input.png","style_id":"secret-style","version":4,"resolution":"1024","seed":7,"decimation_target":50000,"texture_size":2048},request_id=internal); assert job.provider_job_id=="fal-1"
 submit=t.calls[0][2]
 assert submit["json"] == {"image_url":"https://cdn/input.png","resolution":"1024","seed":7,"decimation_target":50000,"texture_size":2048,"sparse_structure_lora_url":"https://private/sparse","geometry_lora_url":"https://private/geo","texture_lora_url":"https://private/tex"}
 assert submit["params"] == {"fal_webhook":f"https://api/webhooks/fal/trellis2/{internal}"}
 assert "style_id" not in submit["json"] and "version" not in submit["json"] and "loras" not in submit["json"]
 for kwargs in ({"loras":{"shape":"https://x"}}, {"loras":{"geometry":"http://x"}}, {"timeout_seconds":float("inf")}):
  try: Trellis2HairProvider(api_key="x",enabled=True,**kwargs); raise AssertionError()
  except FalProviderError as e: assert not e.retryable
 assert p.get_status("fal-1").value=="succeeded"; assert p.get_result("fal-1").raw_asset_url.endswith(".glb")
 assert all("secret" not in repr(call[2].get("json")) for call in t.calls)
 try: Trellis2HairProvider(api_key="",enabled=False).submit({"image_url":"https://x"},request_id="x"); raise AssertionError()
 except Exception: pass
 transient=Trellis2HairProvider(api_key="x",enabled=True,transport=Transport([Response(429,{})]))
 try: transient.submit({"image_url":"https://x"},request_id="22222222-2222-4222-8222-222222222222"); raise AssertionError()
 except FalProviderError as e: assert e.retryable
 clock=Clock(); polling_transport=Transport([Response(200,{"status":"IN_QUEUE"}),Response(200,{"status":"IN_PROGRESS"}),Response(200,{"status":"COMPLETED"})])
 polling=Trellis2HairProvider(api_key="x",enabled=True,transport=polling_transport)
 assert polling.wait_for_completion("fal-poll",window_seconds=10,poll_seconds=1,monotonic=clock.now,sleeper=clock.sleep)
 assert [call[0] for call in polling_transport.calls] == ["GET","GET","GET"]
 clock=Clock(); timeout_transport=Transport([Response(200,{"status":"IN_QUEUE"}),Response(200,{"status":"IN_PROGRESS"})])
 pending=Trellis2HairProvider(api_key="x",enabled=True,transport=timeout_transport)
 assert not pending.wait_for_completion("fal-pending",window_seconds=1,poll_seconds=1,monotonic=clock.now,sleeper=clock.sleep)
 assert all(call[0] == "GET" for call in timeout_transport.calls)  # resume uses the checkpoint; no resubmit
 private=Ed25519PrivateKey.generate(); public=private.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)
 b64=lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")
 body=b'{"request_id":"req"}'; now=int(time.time()); digest=hashlib.sha256(body).hexdigest(); msg=f"req\nuser\n{now}\n{digest}".encode(); sig=private.sign(msg).hex()
 webhook._cache=None; wt=Transport([Response(200,{"keys":[{"x":b64(public)}]})])
 result=webhook.verify_fal_webhook(body,{"X-Fal-Webhook-Request-Id":"req","X-Fal-Webhook-User-Id":"user","X-Fal-Webhook-Timestamp":str(now),"X-Fal-Webhook-Signature":sig},now=now,transport=wt); assert result["request_id"]=="req"
 # Exact replay remains valid at authentication; persistence is responsible for idempotence.
 assert webhook.verify_fal_webhook(body,{"X-Fal-Webhook-Request-Id":"req","X-Fal-Webhook-User-Id":"user","X-Fal-Webhook-Timestamp":str(now),"X-Fal-Webhook-Signature":sig},now=now)["request_id"]=="req"
 try: webhook.verify_fal_webhook(body+b"!",{"X-Fal-Webhook-Request-Id":"req","X-Fal-Webhook-User-Id":"user","X-Fal-Webhook-Timestamp":str(now),"X-Fal-Webhook-Signature":sig},now=now); raise AssertionError()
 except webhook.FalWebhookError: pass
 try: webhook.verify_fal_webhook(body,{"X-Fal-Webhook-Request-Id":"req","X-Fal-Webhook-User-Id":"user","X-Fal-Webhook-Timestamp":str(now-301),"X-Fal-Webhook-Signature":sig},now=now); raise AssertionError()
 except webhook.FalWebhookError: pass
 migration=Path(__file__).resolve().parents[2]/"web/supabase/migrations/12_trellis2_job_checkpoints.sql"; sql=migration.read_text()
 assert "lease_expires_at > NOW()" in sql and "duplicate_risk" in sql
 assert "accept_trellis2_webhook(p_job_id UUID" in sql and "provider_request_id=COALESCE(provider_request_id,p_provider_request_id)" in sql
 assert "fal_request_id_conflict" in sql and "fal_webhook_replay_conflict" in sql
 print("TRELLIS.2 provider validation: PASS")
if __name__=="__main__": main()
