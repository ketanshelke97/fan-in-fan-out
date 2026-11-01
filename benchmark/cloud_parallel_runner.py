import json
import os
import sys
import time
from pathlib import Path
import requests

# Base endpoint defaults to local functions host or remote Azure Function App
DEFAULT_API_BASE = os.environ.get("FUNCTION_APP_URL", "http://localhost:7071")


def run_cloud_benchmark(api_base: str, num_docs: int = 25):
    docs_dir = Path(__file__).resolve().parent / "sample_docs"
    pdf_files = sorted(list(docs_dir.glob("*.pdf")))[:num_docs]

    if not pdf_files:
        print(f"Error: No sample PDFs found in {docs_dir}. Run generate_sample_docs.py first!")
        return

    print("=" * 70)
    print("  PROJECT ANTIGRAVITY | CLOUD PARALLEL FAN-OUT / FAN-IN BENCHMARK")
    print(f"  Target Endpoint: {api_base}")
    print(f"  Batch Volume   : {len(pdf_files)} PDF documents")
    print("=" * 70)

    # 1. Construct Batch Manifest
    batch_id = f"batch-bench-{int(time.time())}"
    manifest = {
        "batch_id": batch_id,
        "batch_name": f"Antigravity Benchmark {len(pdf_files)} Docs",
        "submitted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "files": [
            {
                "file_name": p.name,
                "blob_url": f"https://stfanin1001.blob.core.windows.net/incoming-batches/{batch_id}/{p.name}",
                "sas_token": "?mock_token=1",
                "byte_size": p.stat().st_size
            }
            for p in pdf_files
        ]
    }

    # 2. Trigger Starter Endpoint
    start_url = f"{api_base.rstrip('/')}/api/batches/start"
    print(f"\n[1/3] Posting batch manifest to starter: {start_url} ...")
    start_time = time.time()

    try:
        resp = requests.post(start_url, json=manifest, timeout=30)
    except Exception as e:
        print(f"Connection failed: {e}")
        print("\nMake sure your Azure Functions host is running (`func host start` in backend/)!")
        return

    if resp.status_code not in (200, 202):
        print(f"Failed to start orchestration! Status {resp.status_code}: {resp.text}")
        return

    starter_payload = resp.json()
    status_uri = starter_payload.get("statusQueryGetUri")
    instance_id = starter_payload.get("id")
    print(f"  [OK] Orchestration Started!")
    print(f"  Instance ID: {instance_id}")
    print(f"  Status Query URI: {status_uri}")

    # 3. Poll Status Endpoint Until Orchestration Completes
    print("\n[2/3] Polling orchestration runtime (Fan-Out execution & Fan-In aggregation)...")
    completed = False
    final_output = None

    while not completed:
        time.sleep(1.0)
        status_resp = requests.get(status_uri)
        if status_resp.status_code == 200:
            status_data = status_resp.json()
            runtime_status = status_data.get("runtimeStatus")
            elapsed = time.time() - start_time
            print(f"  [T+{elapsed:4.1f}s] Runtime Status: {runtime_status}")

            if runtime_status == "Completed":
                completed = True
                final_output = status_data.get("output")
            elif runtime_status in ("Failed", "Terminated"):
                print(f"Orchestration ended with status: {runtime_status}")
                return
        else:
            print(f"Warning: polling returned status {status_resp.status_code}")

    total_wallclock = time.time() - start_time

    # 4. Print Summary Dossier
    print("\n" + "=" * 70)
    print("  CLOUD PARALLEL BENCHMARK RESULTS")
    print("=" * 70)
    if final_output:
        print(f"  Batch ID               : {final_output.get('batch_id')}")
        print(f"  Total Files Processed  : {final_output.get('total_files')}")
        print(f"  Total Pages Extracted  : {final_output.get('total_pages')}")
        print(f"  Parallel Duration (s)  : {total_wallclock:.2f} seconds")
        print(f"  Reported Cloud Duration: {final_output.get('total_duration_ms', 0) / 1000:.2f} seconds")
        print(f"  Speedup Factor         : {final_output.get('parallel_speedup_factor', 'N/A')}x")
        print(f"  Unique Entity Categories: {list(final_output.get('global_entities', {}).keys())}")
    print("=" * 70)


if __name__ == "__main__":
    endpoint = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_API_BASE
    docs_to_run = int(sys.argv[2]) if len(sys.argv) > 2 else 25
    run_cloud_benchmark(endpoint, docs_to_run)
