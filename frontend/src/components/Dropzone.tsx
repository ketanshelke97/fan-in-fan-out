import React, { useRef, useState } from 'react';
import { CheckCircle2, FileText, FolderUp, Zap } from 'lucide-react';

interface DropzoneProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onLoadBenchmarkFiles: () => void;
  isProcessing: boolean;
  onExecuteBatch: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ files, onFilesSelected, onLoadBenchmarkFiles, isProcessing, onExecuteBatch }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalSizeMB = (files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(2);

  const stageFiles = (items: File[]) => onFilesSelected(items.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')));

  return (
    <section className="panel ingestion-panel" aria-labelledby="ingestion-title">
      <div className="panel-header">
        <div>
          <div className="panel-kicker">01 · Intake</div>
          <h2 id="ingestion-title" className="panel-title">Stage a document batch</h2>
          <p className="panel-description">Add PDFs to prepare the manifest for parallel extraction.</p>
        </div>
        <button className="button button-secondary" type="button" disabled={isProcessing} onClick={onLoadBenchmarkFiles}>
          <Zap size={14} /> Load benchmark set
        </button>
      </div>
      <div className="panel-body">
        <input ref={fileInputRef} type="file" multiple accept=".pdf,application/pdf" hidden onChange={event => stageFiles(Array.from(event.target.files ?? []))} />
        <button
          type="button"
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={event => { event.preventDefault(); setIsDragging(false); stageFiles(Array.from(event.dataTransfer.files)); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderUp size={30} />
          <span className="dropzone-title">Drop PDFs here, or browse your device</span>
          <span className="dropzone-hint">PDF only · The selected files remain staged until you start the batch.</span>
          <span className="dropzone-action">Choose files</span>
        </button>

        {files.length > 0 ? (
          <>
            <div className="queue-meta">
              <span><strong>{files.length}</strong> documents · {totalSizeMB} MB</span>
              <span className="ready"><CheckCircle2 size={14} /> Manifest ready</span>
            </div>
            <div className="file-list" aria-label="Staged documents">
              {files.map((file, index) => (
                <div className="file-row" key={`${file.name}-${index}`}>
                  <FileText size={14} />
                  <span title={file.name}>{file.name}</span>
                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                </div>
              ))}
            </div>
            <button className="button button-primary" type="button" disabled={isProcessing} onClick={onExecuteBatch}>
              <Zap size={16} /> {isProcessing ? 'Orchestrating fan-out…' : `Start extraction · ${files.length} files`}
            </button>
          </>
        ) : <p className="intake-empty">No documents staged. Use the benchmark set for a guided demonstration.</p>}
      </div>
    </section>
  );
};
