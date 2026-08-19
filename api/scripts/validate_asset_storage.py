#!/usr/bin/env python3
from __future__ import annotations
import os
from pathlib import Path
import sys
from typing import Any
API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))
from services.storage.asset_storage import AssetStorageError, StoredAssetRef
from services.storage.supabase_storage import SupabaseAssetStorage, validate_asset_ref

class FakeBucket:
    def __init__(self, name: str) -> None:
        self.name=name; self.calls=[]; self.listing=[]
    def upload(self, *, path: str, file: Any, file_options: dict[str, Any]): self.calls.append(("upload", {"path":path,"file":file,"file_options":file_options})); return {"path":path}
    def remove(self, paths): self.calls.append(("remove", paths)); return {"data":paths}
    def create_signed_url(self, path, expires_in): self.calls.append(("create_signed_url", {"path":path,"expires_in":expires_in})); return {"signedURL":f"https://signed.example/{self.name}/{path}?expires={expires_in}"}
    def create_signed_upload_url(self, path, options=None): self.calls.append(("create_signed_upload_url", {"path":path,"options":options or {}})); return {"signedURL":f"https://signed.example/{self.name}/{path}?upload=1","token":"upload-token"}
    def list(self,parent,options): self.calls.append(("list", {"parent":parent,"options":options})); return self.listing
class FakeStorage:
    def __init__(self): self.buckets={}
    def from_(self,name): return self.buckets.setdefault(name, FakeBucket(name))
class FakeSupabaseClient:
    def __init__(self): self.storage=FakeStorage()
def expect_asset_error(name, callback):
    try: callback()
    except AssetStorageError: print(f"[PASS] {name}"); return
    raise AssertionError(f"[FAIL] {name}: expected AssetStorageError")
def assert_path_validation():
    valid=validate_asset_ref(StoredAssetRef("heads","canonical/users/u1/head.glb")); assert valid.path=="canonical/users/u1/head.glb"
    expect_asset_error("absolute storage path rejected",lambda:validate_asset_ref(StoredAssetRef("heads","/tmp/head.glb")))
    expect_asset_error("path traversal rejected",lambda:validate_asset_ref(StoredAssetRef("heads","canonical/users/u1/../other/head.glb")))
    expect_asset_error("double-slash storage path rejected before normalization",lambda:validate_asset_ref(StoredAssetRef("heads","canonical/users/u1//head.glb")))
    expect_asset_error("dot storage path segment rejected before normalization",lambda:validate_asset_ref(StoredAssetRef("heads","canonical/users/u1/./head.glb")))
    expect_asset_error("backslash path rejected",lambda:validate_asset_ref(StoredAssetRef("heads","users\\u1\\head.glb")))
    expect_asset_error("unsupported bucket rejected",lambda:validate_asset_ref(StoredAssetRef("public-random","head.glb")))
def assert_sdk_mapping():
    client=FakeSupabaseClient(); storage=SupabaseAssetStorage("https://project.supabase.co","service-role-test-key",client=client); asset=StoredAssetRef("heads","canonical/users/u1/head.glb")
    assert storage.put_object(asset,b"glb",content_type="model/gltf-binary")==asset; bucket=client.storage.from_("heads")
    storage.create_signed_upload(asset,upsert=False); assert bucket.calls[-1][1]["options"]["upsert"] is False
    storage.create_signed_upload(asset,upsert=True); assert bucket.calls[-1][1]["options"]["upsert"] is True
def assert_fail_closed_configuration():
    old_public=os.environ.pop("NEXT_PUBLIC_SUPABASE_URL",None); old_server=os.environ.pop("SUPABASE_URL",None); old_key=os.environ.pop("SUPABASE_SERVICE_ROLE_KEY",None); old_env=os.environ.get("FASTAPI_ENV")
    try:
        expect_asset_error("missing AssetStorage credentials fail closed",SupabaseAssetStorage.from_env)
        os.environ["FASTAPI_ENV"]="production"; expect_asset_error("cleartext Supabase AssetStorage URL rejected in production",lambda:SupabaseAssetStorage("http://project.supabase.local","service-role-test-key",client=FakeSupabaseClient()))
    finally:
        if old_public is not None: os.environ["NEXT_PUBLIC_SUPABASE_URL"]=old_public
        if old_server is not None: os.environ["SUPABASE_URL"]=old_server
        if old_key is not None: os.environ["SUPABASE_SERVICE_ROLE_KEY"]=old_key
        if old_env is None: os.environ.pop("FASTAPI_ENV",None)
        else: os.environ["FASTAPI_ENV"]=old_env
def assert_web_contract():
    upload=(REPO_ROOT/"web/src/app/api/upload/presigned-url/route.ts").read_text(); client=(REPO_ROOT/"web/src/lib/storage.ts").read_text(); read=(REPO_ROOT/"web/src/app/api/storage/signed-read/route.ts").read_text()
    required=["storageRef:" in upload,"uploadToSignedUrl" in client,"publicUrl" not in client,"getVerifiedPrincipal" in read,"principalOwnsAsset" in read,"getServiceSupabase" in read]; assert all(required)
def main(): assert_path_validation(); assert_sdk_mapping(); assert_fail_closed_configuration(); assert_web_contract(); print("Durable AssetStorage contract: PASS")
if __name__=="__main__": main()
