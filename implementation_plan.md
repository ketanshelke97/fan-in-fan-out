# Architecture & Phased Implementation Plan: Serverless "Fan-Out / Fan-In" Parallel Document Extraction Engine
**Project Codename:** Antigravity Dossier Engine  
**Target Environment:** Microsoft Azure (Student Tier / $100 Budget Guarded)  
**Runtime:** Python 3.10 / 3.11 (Azure Functions Python v2 Programming Model) + React / Vite (Static Web Apps)

---

## Executive Summary & System Architecture

Batch-processing dense, multi-page unstructured documents (research publications, corporate financial audits, legal filings) sequentially on a conventional server creates an exponential compute bottleneck. Processing 30–50 documents on an 8-core CPU saturates system memory and locks thread pools for 10–15 minutes. 

The **Serverless Fan-Out / Fan-In Parallel Document Extraction Engine** replaces monolithic sequential execution with dynamic cloud-native elasticity:
1. **Dynamic Ingestion Buffer:** Files are staged directly to **Azure Blob Storage** via client-generated pre-signed SAS tokens.
2. **Decoupled Orchestration:** An HTTP/Event Grid starter invokes an **Azure Durable Functions** orchestrator.
3. **Elastic Fan-Out:** The orchestrator dispatches $N$ parallel activity worker instances (one per document) concurrently. The consumption compute fabric spins up dedicated serverless worker runtimes within milliseconds.
4. **Cognitive Extraction:** Each worker streams its target document into **Azure AI Document Intelligence** to extract structured tables, key-value form pairs, entities, and summaries.
5. **Durable Fan-In & Reconciliation:** Once all concurrent worker tasks resolve (`context.task_all`), an aggregator activity executes **Fan-In**, performs entity deduplication, calculates aggregate corpus statistics, and records the consolidated dossier in **Azure Cosmos DB (Serverless)** and Azure Blob Storage.
6. **Live Telemetry & Telemetry Proof:** Real-time scale-out telemetry (1 $\to$ $N$ active compute containers $\to$ 0) is visualised live via **Azure Application Insights**.

```
                           ┌──────────────────────────────────────────────┐
                           │          Azure Static Web App (Vite)         │
                           │   - Drag-and-Drop Dropzone                   │
                           │   - Real-time Concurrency Monitor            │
                           │   - Consolidated Dossier Viewer              │
                           └──────────────┬───────────────────────────────┘
                                          │ Direct SAS Upload
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Azure Blob Storage (Buffer)   │
                         │    container: `incoming-batches`│
                         └────────────────┬────────────────┘
                                          │ Manifest Post / BlobCreated
                                          ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                   Azure Durable Functions (Python v2 App)                   │
     │                                                                             │
     │  ┌────────────────────────┐      Instantiates       ┌────────────────────┐  │
     │  │  HttpOrEventGridStarter│ ──────────────────────► │DocumentBatch       │  │
     │  │  (Starter Function)    │                         │Orchestrator        │  │
     │  └────────────────────────┘                         └─────────┬──────────┘  │
     │                                                               │             │
     │                   ┌─────────────────── Fan-Out ───────────────┼─────────┐   │
     │                   │                                           │         │   │
     │                   ▼                                           ▼         ▼   │
     │        ┌────────────────────┐                       ┌────────────────┐  │   │
     │        │ExtractDocWorker #1 │                       │ExtractWorker #N│  │   │
     │        └──────────┬─────────┘                       └───────┬────────┘  │   │
     │                   │                                         │           │   │
     │                   ▼                                         ▼           │   │
     │        ┌─────────────────────────────────────────────────────────────┐  │   │
     │        │          Azure AI Document Intelligence (Free F0)           │  │   │
     │        │       Layout, Tables, Key-Value Pairs, Text Analysis        │  │   │
     │        └─────────────────────────────────────────────────────────────┘  │   │
     │                                                                         │   │
     │                   └─────────────────── Fan-In ────────────────┼─────────┘   │
     │                                                               │             │
     │                                                               ▼             │
     │                                             ┌───────────────────────────┐   │
     │                                             │ConsolidateAndIndexDossier │   │
     │                                             │(Aggregator Activity)      │   │
     │                                             └─────────────┬─────────────┘   │
     └───────────────────────────────────────────────────────────┼─────────────────┘
                                                                 │
                                    ┌────────────────────────────┴───────────────────────────┐
                                    ▼                                                        ▼
                    ┌───────────────────────────────┐                       ┌─────────────────────────────────┐
                    │  Azure Cosmos DB (Serverless) │                       │   Azure Blob Storage (Outputs)  │
                    │   container: `dossiers`       │                       │    container: `processed-doss` │
                    └───────────────────────────────┘                       └─────────────────────────────────┘
```

---

## Financial Feasibility & Budget Optimization Matrix ($100 Student Cap)

To strictly safeguard the student balance and prevent unintended cloud expenditures, all 7 Azure services are configured on **Serverless**, **Consumption**, or **Free (F0)** tiers:

| Service Component | Selected SKU / Mode | Student Free Allowance | Expected Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Azure Functions** | Dynamic Consumption (Y1) | 1,000,000 executions / mo + 400,000 GB-s | **$0.00** |
| **Azure AI Document Intelligence** | F0 (Free Tier) | 500 pages / month (20 pages/min limit) | **$0.00** |
| **Azure Cosmos DB** | Serverless Capability (`EnableServerless`) | Pay-per-RU ($0.25 per 1M RUs) | **< $0.20** |
| **Azure Blob Storage** | Standard LRS (Hot tier) | First 5 GB free for 12 months | **< $0.05** |
| **Azure Event Grid** | Consumption Tier | 100,000 operations free / mo | **$0.00** |
| **Azure Static Web Apps** | Free Tier (Hobby) | 3 custom domains, 100 GB bandwidth | **$0.00** |
| **Azure Application Insights** | Basic Ingestion | 5 GB/month data ingestion free | **$0.00** |
| **Total Projected Cost** | — | — | **< $0.50 / Month** |

> [!CAUTION]
> **Caution 1: Cosmos DB "Provisioned" vs. "Serverless" ($24/Month Trap)**
> - **The Danger:** By default, Azure provisions Cosmos DB with a baseline of 400 RU/s (Request Units per second), costing ~$0.032/hr or **~$24.00/month** even when idle! Over 4 months, this silently drains the entire $100 student balance.
> - **The Safeguard:** Our deployment scripts explicitly pass `--capabilities EnableServerless`. In serverless mode, idle compute cost is strictly **$0.00**. You only pay for active read/write milliseconds ($0.25 per 1,000,000 RUs), keeping total project cost under **$0.20**.
>
> **Caution 2: AI Document Intelligence Free Tier (F0) Rate Limit (20 Requests/Minute Throttle)**
> - **The Danger:** The F0 (Free) tier limits ingestion to **20 transactions per minute**. In a true Fan-Out pattern with 25–50 concurrent files, 25 workers invoke the AI API at the exact same millisecond, triggering `HTTP 429: Too Many Requests` on worker #21 onward.
> - **The Safeguard:** We implement a dual defense:
>   1. *Exponential Retry Jitter:* Workers that receive HTTP 429 automatically pause and retry with exponential backoff without crashing the orchestrator.
>   2. *Viva Stress-Test Toggle (`ENABLE_MOCK_EXTRACTION=true`):* When demonstrating 50+ concurrent serverless worker spin-ups to professors, this toggle enables local multi-threaded PDF parsing, avoiding external cognitive API rate limits while still proving pure cloud compute elasticity on Application Insights Live Metrics.

---

## Phase 1: Repository Architecture & Local Simulation Environment

### 1.1 Monorepo Directory Structure
```
fan-in-fan-out/
├── .vscode/
│   ├── extensions.json             # Recommended Azure Tools, Functions & Azurite extensions
│   ├── launch.json                 # Python debugger configurations for Azure Functions
│   └── tasks.json                  # Background tasks (func host start, azurite start)
├── backend/
│   ├── function_app.py             # Single entrypoint for Python v2 DFApp (4 Cloud Functions)
│   ├── host.json                   # Host configuration (Durable extension, logging)
│   ├── local.settings.json         # Local dev environment secrets and connection strings
│   ├── requirements.txt            # Locked Python runtime dependencies
│   └── shared/
│       ├── __init__.py
│       ├── ai_extractor.py         # Document Intelligence client & token management
│       ├── cosmos_client.py        # Cosmos DB Serverless DAO & schema upsert
│       ├── models.py               # Pydantic models for manifests, extractions, dossiers
│       └── mock_extractor.py       # High-throughput mock parser for 100-file stress tests
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx                 # Core UI: dropzone, live metrics, dossier inspection
│   │   ├── components/
│   │   │   ├── Dropzone.tsx        # File drag-and-drop with client-side SHA256 & progress
│   │   │   ├── ConcurrencyMap.tsx  # Dynamic node visualizer showing active parallel workers
│   │   │   ├── DossierViewer.tsx   # JSON dossier tree view + tables & entity inspector
│   │   │   └── BenchmarkCard.tsx   # Comparison card: Local Sequential vs. Cloud Fan-Out
│   │   ├── services/
│   │   │   └── azureApi.ts         # SAS generation, batch submission, statusQuery polling
│   │   └── styles/
│   │       └── index.css           # Modern dark-mode glassmorphism styling
├── infrastructure/
│   ├── deploy.bicep                # Complete Infrastructure as Code (IaC) template
│   ├── deploy.sh                   # Azure CLI automated provisioning script (Linux/macOS)
│   └── deploy.ps1                  # Azure CLI automated provisioning script (PowerShell)
├── benchmark/
│   ├── generate_sample_docs.py     # Script creating 25 multi-page sample test PDFs
│   ├── local_sequential_runner.py  # Single-machine baseline benchmark script (CPU monitor)
│   └── cloud_parallel_runner.py    # Remote trigger & latency collection script
└── README.md
```

### 1.2 Local Emulation Prerequisites
To run the Durable Functions pipeline locally without incurring cloud calls or network latency:
1. **Azurite Storage Emulator:** Emulates Azure Blob, Queue, and Table services locally on ports 10000, 10001, 10002.
2. **Azure Functions Core Tools v4:** Provides the local runtime host.
3. **Python 3.10 or 3.11:** Required for Azure Functions Python v2 compatibility.

### 1.3 Backend Dependencies (`backend/requirements.txt`)
```txt
azure-functions>=1.18.0
azure-functions-durable>=1.2.8
azure-ai-documentintelligence>=1.0.0b3
azure-cosmos>=4.6.0
azure-storage-blob>=12.19.0
azure-identity>=1.15.0
pydantic>=2.6.0
pypdf>=4.0.0
requests>=2.31.0
```

---

## Phase 2: Automated Azure Resource Provisioning

We provide both an **Azure CLI** execution script and a declarative **Bicep** template to automate deployment across all 7 services within a single resource group (e.g., `rg-fanin-fanout-prod`) in `eastasia` (selected from allowed regions `["malaysiawest","koreacentral","uaenorth","austriaeast","eastasia"]`).

### 2.1 Azure CLI Automated Provisioning Script (`infrastructure/deploy.ps1`)
```powershell
# Parameters
$RG = "rg-fanin-fanout-prod"
$LOCATION = "eastasia"
$RAND = Get-Random -Minimum 1000 -Maximum 9999
$STORAGE = "stfanin$RAND"
$FUNCAPP = "func-dossier-$RAND"
$COSMOS = "cosmos-dossier-$RAND"
$AI_DOC = "docintel-$RAND"
$APPINSIGHTS = "appi-dossier-$RAND"
$SWA = "swa-dossier-$RAND"

# 1. Create Resource Group
az group create --name $RG --location $LOCATION

# 2. Azure Storage Account (Standard LRS Hot)
az storage account create `
    --name $STORAGE `
    --resource-group $RG `
    --location $LOCATION `
    --sku Standard_LRS `
    --kind StorageV2

# Create Storage Containers
$STORAGE_KEY = (az storage account keys list --account-name $STORAGE --resource-group $RG --query "[0].value" -o tsv)
az storage container create --name "incoming-batches" --account-name $STORAGE --account-key $STORAGE_KEY
az storage container create --name "processed-dossiers" --account-name $STORAGE --account-key $STORAGE_KEY

# 3. Application Insights
az monitor app-insights component create `
    --app $APPINSIGHTS `
    --location $LOCATION `
    --resource-group $RG `
    --application-type web

$AI_KEY = (az monitor app-insights component show --app $APPINSIGHTS --resource-group $RG --query "connectionString" -o tsv)

# 4. Azure Cosmos DB (Strictly Serverless Capable)
az cosmosdb create `
    --name $COSMOS `
    --resource-group $RG `
    --capabilities EnableServerless `
    --default-consistency-level Session `
    --locations regionName=$LOCATION failoverPriority=0

az cosmosdb sql database create `
    --account-name $COSMOS `
    --resource-group $RG `
    --name "DocumentIntelligenceDB"

az cosmosdb sql container create `
    --account-name $COSMOS `
    --resource-group $RG `
    --database-name "DocumentIntelligenceDB" `
    --name "Dossiers" `
    --partition-key-path "/batch_id"

# 5. Azure AI Document Intelligence (Free F0 SKU)
az cognitiveservices account create `
    --name $AI_DOC `
    --resource-group $RG `
    --kind FormRecognizer `
    --sku F0 `
    --location $LOCATION `
    --yes

# 6. Azure Function App (Consumption Plan Y1, Python 3.10/3.11)
az functionapp create `
    --name $FUNCAPP `
    --resource-group $RG `
    --storage-account $STORAGE `
    --consumption-plan-location $LOCATION `
    --runtime python `
    --runtime-version 3.11 `
    --functions-version 4 `
    --os-type Linux `
    --app-insights $APPINSIGHTS

# Configure App Settings in Function App
$DOC_ENDPOINT = (az cognitiveservices account show --name $AI_DOC --resource-group $RG --query "properties.endpoint" -o tsv)
$DOC_KEY = (az cognitiveservices account keys list --name $AI_DOC --resource-group $RG --query "key1" -o tsv)
$COSMOS_CONN = (az cosmosdb keys list --name $COSMOS --resource-group $RG --type connection-strings --query "connectionStrings[0].connectionString" -o tsv)
$STORAGE_CONN = (az storage account show-connection-string --name $STORAGE --resource-group $RG --query "connectionString" -o tsv)

az functionapp config appsettings set `
    --name $FUNCAPP `
    --resource-group $RG `
    --settings `
        "AzureWebJobsStorage=$STORAGE_CONN" `
        "DOCUMENT_INTELLIGENCE_ENDPOINT=$DOC_ENDPOINT" `
        "DOCUMENT_INTELLIGENCE_KEY=$DOC_KEY" `
        "COSMOS_CONNECTION_STRING=$COSMOS_CONN" `
        "STORAGE_CONNECTION_STRING=$STORAGE_CONN" `
        "RAW_CONTAINER_NAME=incoming-batches" `
        "OUTPUT_CONTAINER_NAME=processed-dossiers" `
        "ENABLE_MOCK_EXTRACTION=false"

# 7. Azure Static Web Apps (Free SKU)
az staticwebapp create `
    --name $SWA `
    --resource-group $RG `
    --location $LOCATION `
    --sku Free
```

---

## Phase 3: Durable Functions Implementation (Python v2 Model)

The pipeline is implemented using the official Python v2 programming model for Azure Durable Functions (`DFApp`). It encapsulates the four required functions with explicit contracts, input validation, and resilient error recovery.

### 3.1 Function Contracts & Data Schemas

#### Contract A: Batch Manifest Ingestion Request (`POST /api/orchestrators/document_batch_orchestrator`)
```json
{
  "batch_id": "batch-20261101-9a4f",
  "batch_name": "Q3 Legal Case Filings",
  "submitted_at": "2026-11-01T07:35:00Z",
  "files": [
    {
      "file_name": "case_precedent_01.pdf",
      "blob_url": "https://stfanin1001.blob.core.windows.net/incoming-batches/batch-20261101-9a4f/case_precedent_01.pdf",
      "sas_token": "?sv=2024-05-04&st=...",
      "byte_size": 1845120
    }
  ]
}
```

#### Contract B: Worker Activity Output (`ExtractDocumentWorker`)
```json
{
  "file_name": "case_precedent_01.pdf",
  "status": "SUCCESS",
  "duration_ms": 3412,
  "pages_processed": 4,
  "extracted_entities": [
    {"category": "Jurisdiction", "text": "Supreme Court", "confidence": 0.98},
    {"category": "Date", "text": "October 14, 2024", "confidence": 0.99}
  ],
  "tables": [
    {
      "table_index": 0,
      "row_count": 5,
      "column_count": 3,
      "cells": [["Statute", "Clause", "Penalty"], ["Title 18", "Sec 1001", "$10,000"]]
    }
  ],
  "word_count": 1420,
  "sentiment_summary": "Neutral"
}
```

#### Contract C: Consolidated Dossier Schema (`Cosmos DB Container: Dossiers`)
```json
{
  "id": "batch-20261101-9a4f",
  "batch_id": "batch-20261101-9a4f",
  "batch_name": "Q3 Legal Case Filings",
  "total_files": 25,
  "successful_files": 25,
  "failed_files": 0,
  "total_pages": 94,
  "total_duration_ms": 17820,
  "parallel_speedup_factor": 6.8,
  "global_entities": {
    "Organizations": ["Department of Justice", "FTC"],
    "Dates": ["2024-10-14", "2024-11-01"],
    "Keywords": ["antitrust", "divestiture", "compliance"]
  },
  "documents": [ ... ],
  "status": "COMPLETED",
  "indexed_at": "2026-11-01T07:35:22Z"
}
```

### 3.2 The 4 Cloud Functions Breakdown (`backend/function_app.py`)

1. **Function 1: `HttpOrEventGridStarter` (Client / Starter Function)**
   - Exposes an HTTP endpoint `POST /api/batches/start` (with fallback to Azure Event Grid `BlobCreated` payload).
   - Validates the batch manifest schema via Pydantic.
   - Invokes `client.start_new("document_batch_orchestrator", client_input=manifest)` returning the Durable Functions standard tracking payload (`statusQueryGetUri`, `terminatePostUri`, `purgeHistoryDeleteUri`).
   - Also provides a SAS generation endpoint `POST /api/batches/sas-tokens` enabling direct browser-to-blob streaming without passing massive binary payloads through Function App memory.

2. **Function 2: `DocumentBatchOrchestrator` (Orchestration Trigger)**
   - Receives the manifest containing the list of $N$ files.
   - **Fan-Out:** Instantiates a list comprehension of activity tasks:
     ```python
     parallel_tasks = [
         context.call_activity_with_retry("extract_document_worker", retry_options, file_entry)
         for file_entry in manifest["files"]
     ]
     ```
   - **Fan-In:** Awaits joint completion using the non-blocking durable promise collector:
     ```python
     extraction_results = yield context.task_all(parallel_tasks)
     ```
   - **Consolidation:** Passes all worker outputs into the aggregator activity:
     ```python
     final_dossier = yield context.call_activity("consolidate_and_index_dossier", {
         "batch_id": manifest["batch_id"],
         "batch_name": manifest["batch_name"],
         "results": extraction_results
     })
     return final_dossier
     ```

3. **Function 3: `ExtractDocumentWorker` (Activity Function)**
   - Receives single file coordinates (Blob URL + SAS token).
   - Invokes Azure AI Document Intelligence SDK (`DocumentIntelligenceClient`) using `prebuilt-layout` or `prebuilt-document` models.
   - Extracts bounding boxes, tables, structural text, and key-value entities.
   - **Fault Isolation:** Wraps individual extraction logic in `try/except`. If an individual document is corrupt or exceeds the rate limit, it returns `{ status: "FAILED", error: "..." }` instead of crashing the entire orchestrator, ensuring partial batch success.

4. **Function 4: `ConsolidateAndIndexDossier` (Aggregator Activity)**
   - Reconciles entity maps across all successful worker outputs (frequency counting, unique entity clustering).
   - Computes batch metrics: total pages processed, parallel speedup factor vs. simulated single-core sequential runtime, and batch duration.
   - Upserts the structured dossier record into **Cosmos DB Serverless** container `Dossiers` partitioned on `/batch_id`.
   - Writes the final compiled dossier JSON artifact into Azure Blob Storage container `processed-dossiers`.

---

## Phase 4: AI Extraction, Aggregation & Cosmos DB Persistence

### 4.1 Azure AI Document Intelligence Client Integration
- Handles both remote Blob URL analysis and memory-stream analysis.
- Supports extracting:
  - **Tables:** Structured row/column grids with header recognition.
  - **Key-Value Pairs:** Form fields (e.g., "Invoice Total: $450.00", "Case Number: 2024-CV-109").
  - **Paragraphs & Layout:** Reading order text and section headers.
- **Rate-Limit Resilience:** In the free F0 tier, implements dynamic jittered backoff to gracefully absorb the 20 requests/minute throttle during heavy fan-out batches. Includes an environment switch `ENABLE_MOCK_EXTRACTION=true` for benchmark demonstrations with 50+ documents to illustrate pure cloud compute elasticity without encountering external cognitive quota walls.

### 4.2 Aggregator Cross-Document Entity Reconciliation
- Aggregates individual document entities into a global batch index.
- Groups discovered entities by category (Organization, Person, Location, Monetary Amount, Legal Statute).
- Computes aggregate corpus statistics: total word count, average document density, processing throughput (pages per second).

### 4.3 Cosmos DB Serverless DAO
- Partition Key: `/batch_id` allows instantaneous lookups of complete dossiers with minimal Request Units ($< 5$ RUs per batch read/write).
- Idempotent upserts prevent duplicate batch records on orchestrator replay.

---

## Phase 5: Modern Frontend Dashboard & Live Metrics Integration

### 5.1 Architecture & Aesthetics
A modern React + Vite web dashboard built with a sleek dark-mode glassmorphic interface (charcoal/indigo palette, neon cyan highlights, glowing status badges).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ ANTIGRAVITY | Serverless Fan-Out/Fan-In Document Dossier Engine         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 📤 BATCH INGESTION DROPZONE          │ 📊 REAL-TIME FAN-OUT CONCURRENCY MAP │
│                                      │                                      │
│  ┌────────────────────────────────┐  │  Active Compute Instances: [25 / 25] │
│  │   [ Drag & Drop PDFs Here ]    │  │  Worker #01 [==========] 100% (Done) │
│  │   or Browse (Supports 50+ files│  │  Worker #02 [========  ]  78% (Extr) │
│  └────────────────────────────────┘  │  Worker #03 [==========] 100% (Done) │
│  [ Selected: 25 files | 48.2 MB ]    │  Worker #25 [======    ]  62% (Extr) │
│  [ [▶ Execute Fan-Out Batch] ]       │  Status: FAN-IN AGGREGATION PENDING  │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ 📑 CONSOLIDATED DOSSIER & INTELLIGENCE REPORT                               │
│  Batch: batch-20261101-9a4f | Total Pages: 94 | Duration: 17.8s (vs 240s)   │
│  Parallel Speedup: 13.5x | Cost: $0.003 | Cosmos DB Document: Indexed       │
│                                                                             │
│  [ Extracted Entities ]   [ Global Tables (14) ]   [ Document Graph ]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Key Frontend Components
1. **`Dropzone.tsx`:** Multi-file drag-and-drop selector. Requests pre-signed SAS tokens from the backend and performs direct asynchronous blob streaming in parallel with live byte progress bars.
2. **`ConcurrencyMap.tsx`:** Polls the Durable Functions `statusQueryGetUri` every 1,000ms. Dynamically visualizes the Fan-Out lifecycle (Pending $\to$ Running Workers $\to$ Fan-In Consolidating $\to$ Completed) with active worker badges.
3. **`DossierViewer.tsx`:** Interactive view of the synthesized dossier, including extracted key-value matrices, searchable cross-document entity chips, and tabular data tables.
4. **`BenchmarkCard.tsx`:** Displays a side-by-side comparison chart:
   - Laptop Sequential: Estimated 240s runtime, 100% CPU lockup, 1.2 GB RAM consumption.
   - Azure Serverless Fan-Out: 18s runtime, 0% local CPU load, instant elasticity.

### 5.3 Static Web App Deployment
- Configured with `staticwebapp.config.json` including route fallbacks and reverse proxy rules to bypass CORS when querying the Function App API.

---

## Phase 6: Academic Viva Demonstration Protocol & Benchmarking

To clearly demonstrate cloud computing principles to evaluators during the viva:

### 6.1 Demonstration Workflow

#### Step 1: The Single-Machine Bottleneck (The Control)
- Run `benchmark/local_sequential_runner.py` on the examination laptop against 20 sample PDFs.
- Open Windows Task Manager / Activity Monitor to show all 8 CPU cores pinned at 100%, fans spinning up, and a sequential runtime clocking between **180 and 240 seconds**.

#### Step 2: The Elastic Cloud Fan-Out (The Experiment)
- Open the Azure Static Web App dashboard.
- Upload the identical 20 PDFs and click **Execute Fan-Out Batch**.
- Show the orchestrator instantiating 20 parallel activities simultaneously. All documents process concurrently, completing in **~15 to 18 seconds** (an order-of-magnitude $\sim 12\times$ speedup).

#### Step 3: The Live Telemetry Proof (Azure Portal)
- On a secondary display, open **Azure Portal $\to$ Application Insights $\to$ Live Metrics**.
- Point out to the professors:
  - **Incoming Request Rate:** A simultaneous spike of 20 concurrent invocations.
  - **Server Online Count:** The consumption runtime automatically scaling the container count from 1 instance up to multiple concurrent worker instances, and then dropping back to 0 idle instances after Fan-In completes.
  - **Dependency Duration:** Visualizing the parallel calls to AI Document Intelligence running synchronously across worker threads.

### 6.2 Theoretical Justifications for Professors
- **Amdahl's Law:** Explain how isolating the parallelizable fraction ($P \approx 0.95$) of document extraction and executing it across $N$ serverless workers approaches theoretical maximum speedup ($S = \frac{1}{(1-P) + \frac{P}{N}}$).
- **Asynchronous Decoupling & Event-Driven Architecture:** Contrast polling/synchronous HTTP monoliths with event-driven stateful orchestration via Durable Functions' replay mechanism and event sourcing.
- **Total Cost of Ownership (TCO):** Explain that zero provisioned infrastructure means 0 idle compute costs ($0/hour when no documents are uploaded, versus $50–$150/month for an always-on VM or Kubernetes cluster).

---

## Implementation Roadmap & Milestone Delivery Status

### 🟢 Phase 1: Local Monorepo & Emulation Environment
* **Status:** Verified & Operational
* **Deliverables:**
  * Standardized monorepo architecture (`.vscode/`, `backend/`, `frontend/`, `infrastructure/`, `benchmark/`).
  * Python 3.10 isolated runtime configured in `backend/.venv` with locked dependencies.
  * Azure Functions developer tooling (`settings.json`, `tasks.json`, `launch.json`).
  * Synthetic test corpus generator producing 25 multi-page financial & legal PDFs (`generate_sample_docs.py`).
  * Baseline single-machine sequential benchmark runner (`local_sequential_runner.py`) proving single-core saturation.

### 🟢 Phase 2: Budget-Guarded Azure Infrastructure (IaC)
* **Status:** Provisioning Scripts Ready (Target Region: `eastasia`)
* **Deliverables:**
  * Automated deployment scripts in PowerShell (`deploy.ps1`) and Bash (`deploy.sh`).
  * Declarative Infrastructure as Code template (`deploy.bicep`) for all 7 Azure services.
  * Strict cost safeguards: Cosmos DB explicitly configured with `--capabilities EnableServerless`, Document Intelligence on Free `F0` tier, and Function App on Consumption Plan `Y1`.

### 🟢 Phase 3: Serverless Durable Functions Core (Python v2)
* **Status:** Implemented in `backend/function_app.py`
* **Deliverables:**
  * `http_batch_starter`: HTTP starter with SAS token generation and Pydantic validation.
  * `document_batch_orchestrator`: Stateful fan-out loop across $N$ files with non-blocking `context.task_all` fan-in.
  * `extract_document_worker`: Concurrent activity worker with dual-mode support (Azure AI + mock stress test).
  * `consolidate_and_index_dossier`: Aggregator reconciling cross-document findings and computing speedup factors.

### 🟢 Phase 4: Cognitive AI Extraction & Persistence
* **Status:** Verified & Offline-Resilient
* **Deliverables:**
  * `ai_extractor.py`: Azure AI Document Intelligence SDK client wrapper with `AnalyzeDocumentRequest` byte/URL parsing.
  * `mock_extractor.py`: Local multi-threaded regex & table parser for quota-free 50-file stress demonstrations.
  * `cosmos_client.py`: Cosmos DB Serverless DAO with safe local storage fallback.

### 🟢 Phase 5: Modern Web Dashboard (React + Vite)
* **Status:** Built & Verified (`npm run build` passed)
* **Deliverables:**
  * React 19 + Vite dashboard with dark glassmorphic design system.
  * Interactive Batch Dropzone with 1-click 25 benchmark document loader.
  * Real-time Concurrency Map with live pulsing worker status indicators.
  * Amdahl's Law Comparative Performance Card.
  * Synthesized Dossier Explorer with global entity graph and tabular matrix viewer.
  * Azure Static Web Apps configuration (`staticwebapp.config.json`).

### 🟢 Phase 6: Academic Viva Demonstration Suite
* **Status:** Ready for Evaluation
* **Deliverables:**
  * Single-core baseline test script demonstrating 85%+ CPU saturation.
  * Remote cloud benchmark trigger script (`cloud_parallel_runner.py`).
  * Application Insights Live Metrics examiner presentation protocol in `README.md`.


