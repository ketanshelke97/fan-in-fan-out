import React from 'react';
import { CheckCircle2, Clock3, Cpu, Server } from 'lucide-react';
import { motion } from 'motion/react';
import { FileDescriptor } from '../services/azureApi';

interface ConcurrencyMapProps { files: FileDescriptor[]; runtimeStatus: 'Idle' | 'Pending' | 'Running' | 'Completed' | 'Failed'; elapsedSeconds: number; }

export const ConcurrencyMap: React.FC<ConcurrencyMapProps> = ({ files, runtimeStatus, elapsedSeconds }) => {
  const isRunning = runtimeStatus === 'Running' || runtimeStatus === 'Pending';
  const isCompleted = runtimeStatus === 'Completed';
  const statusClass = isRunning ? 'running' : isCompleted ? 'complete' : '';
  const workerText = isCompleted ? 'Extracted' : isRunning ? 'Processing' : 'Queued';

  return (
    <section className="panel telemetry-panel" aria-labelledby="telemetry-title">
      <div className="panel-header">
        <div>
          <div className="panel-kicker">02 · Execution</div>
          <h2 id="telemetry-title" className="panel-title">Concurrency monitor</h2>
          <p className="panel-description">Observe each document as the orchestration fans out work.</p>
        </div>
        <div className={`status-chip ${statusClass}`}><span className="status-dot" /> {runtimeStatus}</div>
      </div>
      <div className="panel-body">
        <div className="operator-summary">
          <div className="operator-metric"><span className="metric-label">Workers</span><strong className="metric-value">{isRunning ? `${files.length}/${files.length}` : isCompleted ? `${files.length} done` : '0 active'}</strong></div>
          <div className="operator-metric"><span className="metric-label">Elapsed</span><strong className="metric-value">{runtimeStatus === 'Idle' ? '—' : `${elapsedSeconds.toFixed(1)}s`}</strong></div>
          <div className="operator-metric"><span className="metric-label">Pattern</span><strong className="metric-value">Fan-out</strong></div>
        </div>

        {files.length === 0 ? (
          <div className="empty-workers"><Cpu size={28} /><span>Workers appear here once a batch is staged.</span></div>
        ) : (
          <div className="worker-area">
            <div className="worker-label"><span><Server size={13} /> Assigned workers</span><span>{isCompleted ? <CheckCircle2 size={13} /> : <Clock3 size={13} />} {workerText}</span></div>
            <div className="worker-grid">
              {files.map((file, index) => (
                <motion.article key={file.file_name} className={`worker ${statusClass}`} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(index * .025, .45), duration: .24 }}>
                  <div className="worker-top"><span>W-{String(index + 1).padStart(2, '0')}</span><span className="worker-indicator" /></div>
                  <p className="worker-name" title={file.file_name}>{file.file_name}</p>
                  <span className="worker-state">{workerText}</span>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="panel-footer">Durable Functions · <code>context.task_all()</code> · Scale-to-zero workers</footer>
    </section>
  );
};
