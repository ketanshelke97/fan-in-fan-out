import React, { useState, useEffect, useRef } from 'react';
import { Layers, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dropzone } from './components/Dropzone';
import { ConcurrencyMap } from './components/ConcurrencyMap';
import { BenchmarkCard } from './components/BenchmarkCard';
import { DossierViewer } from './components/DossierViewer';
import {
  FileDescriptor,
  BatchManifest,
  ConsolidatedDossier,
  startBatchOrchestration,
  pollOrchestrationStatus
} from './services/azureApi';
import './styles/index.css';

export const App: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileDescriptors, setFileDescriptors] = useState<FileDescriptor[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<'Idle' | 'Pending' | 'Running' | 'Completed' | 'Failed'>('Idle');
  const [dossier, setDossier] = useState<ConsolidatedDossier | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isSimulation, setIsSimulation] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Load 25 synthetic benchmark PDFs for 1-click viva testing
  const handleLoadBenchmarkFiles = () => {
    const syntheticFiles: FileDescriptor[] = Array.from({ length: 25 }, (_, i) => {
      const num = String(i + 1).padStart(2, '0');
      const name = `sample_doc_${num}.pdf`;
      return {
        file_name: name,
        blob_url: `https://stfanin1001.blob.core.windows.net/incoming-batches/${name}`,
        byte_size: 1024 * (40 + (i * 12))
      };
    });

    const dummyFileList = syntheticFiles.map(
      f => new File([new Blob(['%PDF-1.4 dummy content'])], f.file_name, { type: 'application/pdf' })
    );

    setSelectedFiles(dummyFileList);
    setFileDescriptors(syntheticFiles);
    setDossier(null);
    setIsSimulation(false);
    setRuntimeStatus('Idle');
    setElapsedSeconds(0);
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    const descriptors: FileDescriptor[] = files.map(f => ({
      file_name: f.name,
      blob_url: `https://stfanin1001.blob.core.windows.net/incoming-batches/${f.name}`,
      byte_size: f.size
    }));
    setFileDescriptors(descriptors);
    setDossier(null);
    setIsSimulation(false);
    setRuntimeStatus('Idle');
    setElapsedSeconds(0);
  };

  // Timer for elapsed seconds
  useEffect(() => {
    if (runtimeStatus === 'Running' || runtimeStatus === 'Pending') {
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((Date.now() - start) / 1000);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runtimeStatus]);

  // Execute Batch
  const handleExecuteBatch = async () => {
    if (fileDescriptors.length === 0) return;

    setRuntimeStatus('Running');
    setElapsedSeconds(0);
    setIsSimulation(false);
    const batchId = `batch-${Date.now()}`;
    const manifest: BatchManifest = {
      batch_id: batchId,
      batch_name: `Batch Ingestion (${fileDescriptors.length} Files)`,
      submitted_at: new Date().toISOString(),
      files: fileDescriptors
    };

    try {
      // 1. Try initiating real Durable Function starter
      const starterResult = await startBatchOrchestration(manifest);
      const statusUrl = starterResult.statusQueryGetUri;

      if (statusUrl) {
        // Poll status
        const interval = window.setInterval(async () => {
          try {
            const status = await pollOrchestrationStatus(statusUrl);
            if (status.runtimeStatus === 'Completed') {
              clearInterval(interval);
              setRuntimeStatus('Completed');
              if (status.output) setDossier(status.output);
            } else if (status.runtimeStatus === 'Failed') {
              clearInterval(interval);
              setRuntimeStatus('Failed');
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 1000);
      }
    } catch (err) {
      console.warn('Backend unavailable, running high-fidelity client simulation:', err);
      setIsSimulation(true);
      // High-fidelity fallback client simulation for zero-dependency presentations!
      setTimeout(() => {
        const mockDocuments = fileDescriptors.map((f, i) => ({
          file_name: f.file_name,
          status: 'SUCCESS' as const,
          duration_ms: 1200 + ((i * 137) % 600),
          pages_processed: i % 3 === 0 ? 2 : 1,
          extracted_entities: [
            { category: 'Organization', text: 'Department of Justice', confidence: 0.99 },
            { category: 'Date', text: '2026-11-15', confidence: 0.98 },
            { category: 'Currency', text: `$${(i + 1) * 250_000}.00`, confidence: 0.95 }
          ],
          tables: [
            {
              table_index: 0,
              row_count: 3,
              column_count: 3,
              cells: [
                ['Clause', 'Statutory Cap', 'Status'],
                ['Title 15 § 1', '$100,000,000', 'Compliant'],
                ['SOX § 404', '$1,000,000', 'Audited']
              ]
            }
          ],
          word_count: 1400 + (i * 45),
          sentiment_summary: 'Compliant / Verified'
        }));

        const totalPages = mockDocuments.reduce((a, b) => a + b.pages_processed, 0);
        const simSequentialMs = mockDocuments.reduce((a, b) => a + b.duration_ms, 0);
        const parallelDurationMs = 2100;

        const simulatedDossier: ConsolidatedDossier = {
          id: batchId,
          batch_id: batchId,
          batch_name: manifest.batch_name,
          total_files: fileDescriptors.length,
          successful_files: fileDescriptors.length,
          failed_files: 0,
          total_pages: totalPages,
          total_duration_ms: parallelDurationMs,
          parallel_speedup_factor: Number((simSequentialMs / parallelDurationMs).toFixed(1)),
          global_entities: {
            Organizations: ['Department of Justice', 'Federal Trade Commission', 'Acme Corporation'],
            Statutes: ['Title 15 U.S.C. § 1', 'Title 18 U.S.C. § 1001', 'Sarbanes-Oxley § 404'],
            Dates: ['2026-11-10', '2026-11-15', '2026-11-20'],
            Financials: ['$100,000,000', '$250,000', '$1,000,000']
          },
          documents: mockDocuments,
          status: 'COMPLETED',
          indexed_at: new Date().toISOString()
        };

        setRuntimeStatus('Completed');
        setDossier(simulatedDossier);
      }, 2500);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Layers size={19} />
          </div>
          <div className="brand-copy">
            <div className="brand-name">Antigravity</div>
            <div className="brand-subtitle">Document extraction operations</div>
          </div>
        </div>
        <div className="environment">
          <span className="live-dot" /> Azure East Asia · serverless
        </div>
      </header>

      <main className="workspace">
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">Batch operations</div>
            <h1>Process a document batch</h1>
            <p className="heading-description">Stage PDFs, observe fan-out execution, and inspect the reconciled result in one operational workspace.</p>
          </div>
          <div className="session-id">SYSTEM READY · v1.0</div>
        </div>
        <motion.div
          className="dashboard-grid"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
            <Dropzone
            files={selectedFiles}
            onFilesSelected={handleFilesSelected}
            onLoadBenchmarkFiles={handleLoadBenchmarkFiles}
            isProcessing={runtimeStatus === 'Running' || runtimeStatus === 'Pending'}
            onExecuteBatch={handleExecuteBatch}
            />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
            <ConcurrencyMap
            files={fileDescriptors}
            runtimeStatus={runtimeStatus}
            elapsedSeconds={elapsedSeconds}
            />
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.35 }}>
          <BenchmarkCard
            totalFiles={fileDescriptors.length}
            cloudDurationSec={dossier ? dossier.total_duration_ms / 1000 : elapsedSeconds}
            speedupFactor={dossier ? dossier.parallel_speedup_factor : 0}
          />
        </motion.div>

        {isSimulation && (
          <div className="demo-notice">
            <AlertTriangle size={16} /> Backend unavailable: the result below is a clearly marked local simulation, not extracted production data.
          </div>
        )}
        <AnimatePresence mode="wait">
          {dossier && (
            <motion.div
              key={dossier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            >
              <DossierViewer dossier={dossier} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
