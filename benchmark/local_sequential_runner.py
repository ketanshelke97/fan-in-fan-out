import os
import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.shared.mock_extractor import extract_document_mock
import psutil


def run_sequential_benchmark(sample_dir: Path):
    pdf_files = sorted(list(sample_dir.glob("*.pdf")))
    if not pdf_files:
        print(f"Error: No PDFs found in {sample_dir}. Run generate_sample_docs.py first!")
        return

    print("=" * 70)
    print("  PROJECT ANTIGRAVITY | LOCAL SEQUENTIAL BENCHMARK")
    print(f"  Target: {len(pdf_files)} documents sequentially on a single CPU core")
    print("=" * 70)

    process = psutil.Process()
    cpu_measurements = []
    start_total = time.time()
    total_pages = 0
    total_words = 0

    for idx, pdf_path in enumerate(pdf_files, 1):
        step_start = time.time()
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        # Perform extraction
        result = extract_document_mock(pdf_bytes, pdf_path.name)
        total_pages += result.pages_processed
        total_words += result.word_count

        # Simulate heavy CPU entity matching & NLP scoring overhead
        _ = [hash(result.sentiment_summary + str(i)) for i in range(150_000)]

        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_measurements.append(cpu_percent)
        step_ms = int((time.time() - step_start) * 1000)

        print(f"  [{idx:02d}/{len(pdf_files):02d}] Processed {pdf_path.name:<20} | {result.pages_processed} pgs | {step_ms} ms | CPU: {cpu_percent:5.1f}%")

    total_duration = time.time() - start_total
    avg_cpu = sum(cpu_measurements) / max(len(cpu_measurements), 1)
    ram_mb = process.memory_info().rss / (1024 * 1024)

    print("=" * 70)
    print("  LOCAL SEQUENTIAL BENCHMARK RESULTS")
    print("=" * 70)
    print(f"  Total Documents Processed : {len(pdf_files)}")
    print(f"  Total Pages Extracted     : {total_pages}")
    print(f"  Total Words Parsed        : {total_words:,}")
    print(f"  Total Sequential Runtime  : {total_duration:.2f} seconds")
    print(f"  Average System CPU Load   : {avg_cpu:.1f}%")
    print(f"  Process Memory (RSS)      : {ram_mb:.1f} MB")
    print(f"  Single-Core Throughput    : {total_pages / total_duration:.2f} pages/second")
    print("=" * 70)
    print("  BOTTLENECK CONCLUSION:")
    print("  Processing documents sequentially scales linearly O(N). Each additional document")
    print("  directly increases user wait time. On Azure, the Fan-Out pattern processes all")
    print("  documents concurrently in O(1) time across dynamic serverless workers.")
    print("=" * 70)


if __name__ == "__main__":
    docs_path = Path(__file__).resolve().parent / "sample_docs"
    run_sequential_benchmark(docs_path)
