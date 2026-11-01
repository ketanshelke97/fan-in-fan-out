export interface FileDescriptor {
  file_name: string;
  blob_url: string;
  sas_token?: string;
  byte_size?: number;
}

export interface BatchManifest {
  batch_id: string;
  batch_name: string;
  submitted_at: string;
  files: FileDescriptor[];
}

export interface OrchestrationStatusResponse {
  name: string;
  instanceId: string;
  runtimeStatus: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Terminated';
  input: BatchManifest;
  output?: ConsolidatedDossier;
  createdTime: string;
  lastUpdatedTime: string;
}

export interface ExtractedEntity {
  category: string;
  text: string;
  confidence: number;
}

export interface ExtractedTable {
  table_index: number;
  row_count: number;
  column_count: number;
  cells: string[][];
}

export interface WorkerResult {
  file_name: string;
  status: 'SUCCESS' | 'FAILED';
  duration_ms: number;
  pages_processed: number;
  extracted_entities: ExtractedEntity[];
  tables: ExtractedTable[];
  word_count: number;
  sentiment_summary: string;
  error_message?: string;
}

export interface ConsolidatedDossier {
  id: string;
  batch_id: string;
  batch_name: string;
  total_files: number;
  successful_files: number;
  failed_files: number;
  total_pages: number;
  total_duration_ms: number;
  parallel_speedup_factor: number;
  global_entities: Record<string, string[]>;
  documents: WorkerResult[];
  status: string;
  indexed_at: string;
}

const API_BASE = ''; // Proxy via vite or relative on Azure Static Web App

export async function requestUploadSas(fileNames: string[], batchId: string) {
  const resp = await fetch(`${API_BASE}/api/batches/sas-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_names: fileNames, batch_id: batchId })
  });
  if (!resp.ok) throw new Error(`SAS request failed: ${resp.statusText}`);
  return await resp.json();
}

export async function startBatchOrchestration(manifest: BatchManifest) {
  const resp = await fetch(`${API_BASE}/api/batches/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manifest)
  });
  if (!resp.ok) throw new Error(`Orchestration starter failed: ${resp.statusText}`);
  return await resp.json();
}

export async function pollOrchestrationStatus(statusUrl: string): Promise<OrchestrationStatusResponse> {
  const resp = await fetch(statusUrl);
  if (!resp.ok) throw new Error(`Status polling failed: ${resp.statusText}`);
  return await resp.json();
}
