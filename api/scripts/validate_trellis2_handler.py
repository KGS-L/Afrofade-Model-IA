#!/usr/bin/env python3
"""Executable offline integration harness for the TRELLIS.2 durable handler."""
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID
import os, struct, sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import services.jobs.handlers as h
from models.jobs import AIJobRecord, AIJobStatus, AIJobType
from services.hair.providers import HairProviderJobStatus
from services.jobs.worker import PermanentJobError, TransientJobError
from services.storage.asset_storage import StoredAssetRef

JOB_ID=UUID("11111111-1111-4111-8111-111111111111")
NOW=datetime.now(UTC)
GLB=b"glTF"+struct.pack("<II",2,12)
def job():
 return AIJobRecord(id=JOB_ID,job_type=AIJobType.HAIR_GENERATION,user_id=JOB_ID,status=AIJobStatus.RUNNING,
  provider="trellis2",input_payload={"style_id":"style-a","version":1,"image_url":"https://input.example/a.png","resolution":"1024"},
  progress_percent=0,attempts=1,max_attempts=3,priority=0,idempotency_key="hair:1",available_at=NOW,
  locked_at=NOW,locked_by="worker",lease_expires_at=NOW+timedelta(minutes=5),created_at=NOW,started_at=NOW,updated_at=NOW)
class Queue:
 def __init__(self,cp=None): self.cp=cp; self.patches=[]
 def get_trellis2_checkpoint_for_job(self,_): return self.cp
 def checkpoint_trellis2(self,*,patch,**_):
  self.patches.append(patch); self.cp={**(self.cp or {}),**patch}; return self.cp
class Provider:
 loras={"geometry":"https://private.example/lora-v1"}
 def __init__(self,statuses=(HairProviderJobStatus.SUCCEEDED,)): self.statuses=list(statuses); self.submits=0; self.results=0
 def submit(self,_,request_id): self.submits+=1; return SimpleNamespace(provider_job_id="fal-1",created_at=NOW)
 def wait_for_completion(self,*_,**__):
  while self.statuses:
   status=self.statuses.pop(0)
   if status is HairProviderJobStatus.SUCCEEDED:return True
   if status is HairProviderJobStatus.FAILED: raise h.FalProviderError("fal_generation_failed","failed",retryable=False)
  return False
 def get_result(self,_): self.results+=1; return SimpleNamespace(raw_asset_url="https://cdn.fal.media/a.glb")
class Storage:
 def __init__(self,existing=False): self.objects={} if not existing else {"x":GLB}; self.puts=[]
 def exists(self,ref): return bool(self.objects)
 def read_object(self,ref,*,max_bytes): return GLB
 def put_object(self,ref,data,**kw): assert kw["upsert"] is False; self.objects[ref.path]=data; self.puts.append(ref)
class Repo:
 def __init__(self,status="draft"): self.status=status; self.kw=None
 def get_version(self,*_): return None
 def create_draft(self,**kw):
  self.kw=kw; complete=self.status!="draft"
  return SimpleNamespace(id=JOB_ID,status=self.status,provider="trellis2",source_job_id=JOB_ID,raw_ref=kw["raw_ref"],
   canonical_ref=StoredAssetRef("hair-assets","c") if complete else None,preview_ref=StoredAssetRef("hair-assets","p") if complete else None,
   anchor_map_ref=StoredAssetRef("hair-assets","a") if complete else None,scalp_anchor_version="v1" if complete else None,polygon_count=1 if complete else None,
  generation_cost_fcfa=kw["generation_cost_fcfa"],provider_metadata=kw["provider_metadata"])
class ValidatedRepo(Repo):
 def __init__(self,raw_ref):super().__init__("validated");self.raw_ref=raw_ref
 def get_version(self,*_):
  return SimpleNamespace(id=JOB_ID,status="validated",provider="trellis2",source_job_id=JOB_ID,raw_ref=self.raw_ref,
   canonical_ref=StoredAssetRef("hair-assets","c"),preview_ref=StoredAssetRef("hair-assets","p"),anchor_map_ref=StoredAssetRef("hair-assets","a"),
   scalp_anchor_version="v1",polygon_count=1,generation_cost_fcfa=600,provider_metadata={"request_id":"fal-1"})
class Normalizer:
 def __init__(self): self.calls=0
 def normalize(self,_): self.calls+=1; return SimpleNamespace(record=SimpleNamespace(id=JOB_ID))
class DownloadResponse:
 def __init__(self,data=GLB,*,url="https://cdn.fal.media/a.glb",length=None,error=None):
  self.data=data; self.url=url; self.headers={"content-type":"model/gltf-binary"}; self.closed=False; self.error=error
  if length is not None:self.headers["content-length"]=str(length)
 def raise_for_status(self): pass
 def iter_content(self,_):
  yield self.data
  if self.error: raise self.error
 def close(self): self.closed=True
class DownloadSession:
 def __init__(self,response):self.response=response
 def get(self,*_,**__):return self.response
def run(queue,provider=None,storage=None,repo=None,normalizer=None):
 provider=provider or Provider(); storage=storage or Storage(); repo=repo or Repo(); normalizer=normalizer or Normalizer()
 old=h.get_hair_dependencies; old_download=h._download_glb
 h.get_hair_dependencies=lambda:(queue,provider,storage,repo,normalizer); h._download_glb=lambda *_,**__:GLB
 try:return h.handle_hair_generation(job()),provider,storage,repo,normalizer
 finally:h.get_hair_dependencies=old; h._download_glb=old_download
def main():
 os.environ.update(FAL_TRELLIS2_POLL_WINDOW_SECONDS="10",FAL_TRELLIS2_POLL_SECONDS="1",FAL_TRELLIS2_PRICE_USD_1024="1",FAL_USD_TO_FCFA="600")
 q=Queue(); result,p,s,r,n=run(q,Provider((HairProviderJobStatus.SUBMITTED,HairProviderJobStatus.RUNNING,HairProviderJobStatus.SUCCEEDED)))
 assert p.submits==1 and s.puts and r.kw["generation_cost_fcfa"]==600 and n.calls==1 and result["asset_id"]
 assert "https://" not in repr(r.kw["provider_metadata"]["lora_versions"])
 cp={"submission_intended_at":NOW.isoformat(),"provider_request_id":"fal-1","provider_submitted_at":NOW.isoformat(),"webhook_payload":{"request_id":"fal-1","status":"ERROR","error":{"message":"bad"}}}
 try: run(Queue(cp)); raise AssertionError()
 except PermanentJobError as e: assert e.code=="fal_webhook_error"
 intent={"submission_intended_at":datetime.now(UTC).isoformat()}
 provider=Provider()
 try: run(Queue(intent),provider); raise AssertionError()
 except TransientJobError: assert provider.submits==0
 raw_path=f"raw/styles/style-a/v1/trellis2-{JOB_ID}.glb"
 uploaded={"submission_intended_at":NOW.isoformat(),"provider_request_id":"fal-1","provider_submitted_at":NOW.isoformat(),"raw_bucket":"hair-assets","raw_path":raw_path}
 result,p,s,r,n=run(Queue(uploaded),storage=Storage(existing=True)); assert p.results==0 and n.calls==1
 completed={**uploaded,"canonical_asset_id":str(JOB_ID)}
 result,p,s,r,n=run(Queue(completed)); assert result["resumed"] and p.results==0 and n.calls==0
 raw_ref=StoredAssetRef("hair-assets",raw_path); validated_repo=ValidatedRepo(raw_ref)
 result,p,s,r,n=run(Queue(uploaded),storage=Storage(existing=True),repo=validated_repo); assert result["resumed_after_normalization"] and n.calls==0
 response=DownloadResponse(); assert h._download_glb("https://cdn.fal.media/a.glb",max_bytes=100,session=DownloadSession(response))==GLB and response.closed
 response=DownloadResponse(length=101)
 try:h._download_glb("https://cdn.fal.media/a.glb",max_bytes=100,session=DownloadSession(response));raise AssertionError()
 except PermanentJobError:assert response.closed
 response=DownloadResponse(url="https://evil.example/a.glb")
 try:h._download_glb("https://cdn.fal.media/a.glb",max_bytes=100,session=DownloadSession(response));raise AssertionError()
 except PermanentJobError:assert response.closed
 response=DownloadResponse(error=h.requests.ConnectionError("cut"))
 try:h._download_glb("https://cdn.fal.media/a.glb",max_bytes=100,session=DownloadSession(response));raise AssertionError()
 except TransientJobError:assert response.closed
 print("TRELLIS.2 handler integration: PASS")
if __name__=="__main__": main()
