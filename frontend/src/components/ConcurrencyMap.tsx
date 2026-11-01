import React from 'react';
import { Cpu, Server, CheckCircle, Clock } from 'lucide-react';
import { FileDescriptor } from '../services/azureApi';

interface ConcurrencyMapProps {
  files: FileDescriptor[];
  runtimeStatus: 'Idle' | 'Pending' | 'Running' | 'Completed' | 'Failed';
  elapsedSeconds: number;
}

export const ConcurrencyMap: React.FC<ConcurrencyMapProps> = ({
  files,
  runtimeStatus,
  elapsedSeconds
}) => {
  const isRunning = runtimeStatus === 'Running';
  const isCompleted = runtimeStatus === 'Completed';

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>2. Serverless Concurrency Map</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real-time Fan-Out worker scale-out telemetry
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className={`badge-pill ${isRunning ? 'warning' : isCompleted ? 'success' : ''}`}>
            {isRunning && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />}
            {isCompleted && <CheckCircle size={12} />}
            Status: {runtimeStatus}
          </span>
          {runtimeStatus !== 'Idle' && (
            <span className="badge-pill">
              <Clock size={12} /> {elapsedSeconds.toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Server size={16} color="var(--accent-cyan)" />
            <span>Active Serverless Workers:</span>
            <b style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {isRunning ? `${files.length} / ${files.length}` : isCompleted ? `${files.length} Done` : '0 Idle'}
            </b>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Orchestrator: <span style={{ color: 'var(--accent-indigo)' }}>context.task_all()</span>
          </div>
        </div>

        {/* Dynamic Worker Grid */}
        {files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Cpu size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <div>No active batch staged. Load or drop PDF files to trigger workers.</div>
          </div>
        ) : (
          <div className="worker-matrix">
            {files.map((file, idx) => {
              const nodeClass = isCompleted ? 'completed' : isRunning ? 'running' : '';
              return (
                <div key={idx} className={`worker-node ${nodeClass}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>W#{idx + 1}</span>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isCompleted ? 'var(--accent-emerald)' : isRunning ? 'var(--accent-cyan)' : 'var(--text-muted)'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {file.file_name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: isCompleted ? 'var(--accent-emerald)' : isRunning ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {isCompleted ? '✓ Extracted' : isRunning ? '⚡ Processing' : 'Staged'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Pattern: Azure Durable Functions Fan-Out / Fan-In</span>
        <span>Idle Container Cost: $0.00 / hr</span>
      </div>
    </div>
  );
};
