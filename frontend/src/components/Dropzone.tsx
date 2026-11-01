import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Zap } from 'lucide-react';

interface DropzoneProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onLoadBenchmarkFiles: () => void;
  isProcessing: boolean;
  onExecuteBatch: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  files,
  onFilesSelected,
  onLoadBenchmarkFiles,
  isProcessing,
  onExecuteBatch
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        f => f.type === 'application/pdf' || f.name.endsWith('.pdf')
      );
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(selected);
    }
  };

  const totalSizeMB = (files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2);

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>1. Ingestion Buffer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Stage PDFs for parallel serverless fan-out extraction
          </p>
        </div>
        <button
          onClick={onLoadBenchmarkFiles}
          disabled={isProcessing}
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: 'var(--accent-cyan)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Zap size={14} /> Load 25 Benchmark PDFs
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept=".pdf"
        style={{ display: 'none' }}
      />

      <div
        className={`dropzone-box ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="dropzone-icon" size={48} />
        <div className="dropzone-title">Drag & drop PDF documents here</div>
        <div className="dropzone-hint">
          Supports 1 to 50+ research papers, financial audits, or legal filings
        </div>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Staged: <b style={{ color: 'var(--text-primary)' }}>{files.length} documents</b> ({totalSizeMB} MB)
            </span>
            <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={14} /> Ready for Fan-Out
            </span>
          </div>

          <div
            style={{
              maxHeight: '120px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem'
            }}
          >
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.4rem',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <FileText size={12} color="var(--accent-cyan)" />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.name}
                </span>
                <span>{(f.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            disabled={isProcessing || files.length === 0}
            onClick={onExecuteBatch}
          >
            <Zap size={18} />
            {isProcessing ? 'Orchestrating Cloud Fan-Out...' : `Execute Fan-Out Extraction (${files.length} Files)`}
          </button>
        </div>
      )}
    </div>
  );
};
