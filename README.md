# Project Antigravity: Serverless "Fan-Out / Fan-In" Parallel Document Extraction Engine

[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-Python%20v2-0089D6?logo=azure-functions&logoColor=white)](https://learn.microsoft.com/azure/azure-functions/)
[![Azure Cosmos DB](https://img.shields.io/badge/Cosmos%20DB-Serverless-5C2D91?logo=azure-cosmos-db&logoColor=white)](https://azure.microsoft.com/services/cosmos-db/)
[![AI Document Intelligence](https://img.shields.io/badge/AI%20Document%20Intelligence-Free%20F0-0078D4?logo=microsoft-azure&logoColor=white)](https://azure.microsoft.com/services/ai-document-intelligence/)
[![Budget Cap](https://img.shields.io/badge/Budget%20Cap-%3C%20%240.50%20%2F%20mo-10b981)](implementation_plan.md)
[![Region](https://img.shields.io/badge/Region-East%20Asia-38bdf8)](implementation_plan.md)

An enterprise-grade, distributed serverless document extraction engine built for Microsoft Azure. Solves the traditional physical server bottleneck where batch-processing dozens of dense PDFs locks CPU cores and forces slow sequential execution. 

Leverages the cloud's elastic **Fan-Out / Fan-In pattern** to dynamically spin up $N$ parallel serverless worker instances within seconds, parse complex layout/tables/entities via Azure AI, consolidate the outputs into a unified relational dossier in **Cosmos DB Serverless**, and scale compute instances back to zero to achieve **$0.00 idle cost**.

---

## Architecture Diagram

```
[Web Client: React + Vite SWA] 
         │ (Direct SAS Staging)
         ▼
[Azure Blob Storage: incoming-batches]
         │ (HTTP Manifest / Event Grid Trigger)
         ▼
[Azure Durable Functions: HttpOrEventGridStarter]
         │
         ▼
[Azure Durable Functions: DocumentBatchOrchestrator]
         │
         ├─── FAN-OUT ───┬──────────────────────┬──────────────────────┐
         ▼               ▼                      ▼                      ▼
  [Worker #1]       [Worker #2]           [Worker #3]            [Worker #N]
         │               │                      │                      │
         └───────────────┴──────────────┬───────┴──────────────────────┘
                                        │
                                        ▼ (Yield context.task_all())
                                        │
                                 ─── FAN-IN ───
                                        │
                                        ▼
                   [ConsolidateAndIndexDossier (Aggregator)]
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
     [Azure Cosmos DB (Serverless)]          [Azure Blob Storage: processed-dossiers]
```

---

## The 4 Cloud Functions Breakdown

| Function Name | Trigger Type | Architectural Responsibility |
| :--- | :--- | :--- |
| **`http_batch_starter`** | HTTP Trigger (`POST /api/batches/start`) | Validates batch manifest via Pydantic, generates `BatchCorrelationID`, and launches the orchestration instance. |
| **`document_batch_orchestrator`** | `OrchestrationTrigger` | Enumerates batch files, fans out $N$ concurrent worker activity calls (`context.call_activity`), and awaits joint resolution (`context.task_all`). |
| **`extract_document_worker`** | `ActivityTrigger` | Individual worker container instance; pulls assigned blob, streams to Azure AI Document Intelligence, and returns extracted layout, tables, and entities. |
| **`consolidate_and_index_dossier`** | `ActivityTrigger` | Fan-In aggregator; executes after all workers finish, synthesizes cross-document entities, computes speedup metrics, and persists the record to Cosmos DB Serverless. |

---

## Financial Feasibility & Budget Optimization ($100 Student Cap)

| Service Component | Selected SKU | Free Tier Allowance | Expected Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Azure Functions** | Serverless Consumption (Y1) | 1,000,000 invocations / month | **$0.00** |
| **AI Document Intelligence** | F0 (Free Tier) | 500 pages processed / month | **$0.00** |
| **Azure Cosmos DB** | **Serverless Mode** (`EnableServerless`) | Pay-per-RU ($0.25 / 1M RUs) | **< $0.20** |
| **Azure Blob Storage** | Standard LRS (Hot) | First 5 GB free | **< $0.05** |
| **Azure Event Grid** | Consumption Tier | 100,000 operations / month | **$0.00** |
| **Azure Static Web Apps** | Free Tier (Hobby) | Unlimited bandwidth | **$0.00** |
| **Azure Application Insights** | Basic Ingestion | 5 GB / month free | **$0.00** |
| **Total Estimated Cost** | — | — | **< $0.50 / Month** |

> [!IMPORTANT]
> **Cosmos DB Serverless Guard:** Always provision Cosmos DB with `--capabilities EnableServerless`. Standard provisioned mode reserves 400 RU/s 24/7 (~$24/month), which would drain a student credit within 4 months even when idle.

---

## Quick Start: Local Simulation & Benchmarking

### 1. Setup Backend Environment
```bash
# Navigate to backend and activate Python virtual environment
cd backend
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # Linux / macOS

# Install dependencies (already prepared)
pip install -r requirements.txt
```

### 2. Generate Realistic Sample PDFs
```bash
# Generate 25 multi-page test PDFs with tables and legal/financial content
python benchmark/generate_sample_docs.py
```

### 3. Run Single-Machine Baseline Benchmark
```bash
# Run baseline sequential execution on your local CPU (saturates cores)
python benchmark/local_sequential_runner.py
```

### 4. Run Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## Automated Cloud Deployment (Azure CLI)

To deploy all 7 resources to Azure in region `eastasia` with strict budget guards:

```powershell
# In PowerShell (Windows):
cd infrastructure
.\deploy.ps1 -ResourceGroup "rg-fanin-fanout-prod" -Location "eastasia"
```

Or using Bash on Linux/macOS:
```bash
cd infrastructure
chmod +x deploy.sh
./deploy.sh "rg-fanin-fanout-prod" "eastasia"
```

---

## Academic Viva Demonstration Protocol

1. **The Physical Bottleneck Demonstration:**
   - Run `python benchmark/local_sequential_runner.py` on the examination laptop.
   - Show Task Manager / Activity Monitor with CPU cores pinned near 100% and clocking ~150–240 seconds.
2. **The Elastic Cloud Demonstration:**
   - Open the React/Vite dashboard. Click **"Load 25 Benchmark PDFs"** and **"Execute Fan-Out Extraction"**.
   - Show all 25 worker micro-containers executing concurrently in ~15 to 18 seconds (a **12x+ speedup**).
3. **The Live Telemetry Proof (Application Insights):**
   - Open Azure Portal $\to$ **Application Insights $\to$ Live Metrics**.
   - Show professors the active server container count jumping from 1 $\to$ 20+ servers in real time, and dropping back to 0 idle servers after Fan-In.
4. **Theoretical Justification:**
   - Explain **Amdahl's Law** ($S = \frac{1}{(1-P) + \frac{P}{N}}$), showing that isolating the parallelizable document processing fraction ($P \approx 0.95$) achieves near-linear horizontal scaling.

---

## 👥 Team Collaboration & Contributing

Working on the frontend? Check out the dedicated [Frontend Contributor Guide](FRONTEND_CONTRIBUTOR_GUIDE.md) for quickstart instructions (zero cloud installation needed), component architecture, and high-impact UI feature ideas!

