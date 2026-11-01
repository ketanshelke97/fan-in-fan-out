import React, { useState } from 'react';
import { Database, FileText, CheckCircle2, Table as TableIcon, Hash, Tag } from 'lucide-react';
import { ConsolidatedDossier } from '../services/azureApi';

interface DossierViewerProps {
  dossier: ConsolidatedDossier;
}

export const DossierViewer: React.FC<DossierViewerProps> = ({ dossier }) => {
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);

  const selectedDoc = dossier.documents[selectedDocIndex] || dossier.documents[0];

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              4. Synthesized Intelligence Dossier
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Batch ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)' }}>{dossier.batch_id}</span> | Persisted to Cosmos DB & Blob Storage
          </p>
        </div>
        <span className="badge-pill success">
          <CheckCircle2 size={14} /> Fan-In Aggregation Complete
        </span>
      </div>

      {/* KPI Stats Bar */}
      <div className="dossier-stats-bar">
        <div className="stat-card">
          <div className="stat-label">DOCUMENTS PROCESSED</div>
          <div className="stat-value">{dossier.successful_files} / {dossier.total_files}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">TOTAL PAGES PARSED</div>
          <div className="stat-value">{dossier.total_pages}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">PARALLEL DURATION</div>
          <div className="stat-value">{(dossier.total_duration_ms / 1000).toFixed(1)}s</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CLOUD SPEEDUP FACTOR</div>
          <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
            {dossier.parallel_speedup_factor}x
          </div>
        </div>
      </div>

      {/* Cross-Document Global Entity Reconciler */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Tag size={16} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Reconciled Cross-Document Entities</h3>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {Object.entries(dossier.global_entities).map(([category, items]) => (
            <div
              key={category}
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.7rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                {category} ({items.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {items.slice(0, 6).map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem'
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Document Inspection */}
      {selectedDoc && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>
          {/* Document Selector Sidebar */}
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '0.5rem'
            }}
          >
            <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              DOCUMENTS ({dossier.documents.length})
            </div>
            {dossier.documents.map((doc, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedDocIndex(idx)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  background: selectedDocIndex === idx ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: selectedDocIndex === idx ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  border: selectedDocIndex === idx ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  marginBottom: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FileText size={12} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.file_name}
                </span>
              </div>
            ))}
          </div>

          {/* Document Detail Preview */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedDoc.file_name}</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Processed in {selectedDoc.duration_ms} ms &bull; {selectedDoc.pages_processed} pages &bull; {selectedDoc.word_count} words
                </div>
              </div>
              <span className="badge-pill">
                <Hash size={12} /> {selectedDoc.sentiment_summary}
              </span>
            </div>

            {/* Extracted Tables */}
            {selectedDoc.tables.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                  <TableIcon size={14} /> Extracted Tabular Matrix
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <tbody>
                      {selectedDoc.tables[0].cells.map((row, rIdx) => (
                        <tr key={rIdx} style={{ background: rIdx === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              style={{
                                border: '1px solid var(--border-subtle)',
                                padding: '0.4rem 0.6rem',
                                color: rIdx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontWeight: rIdx === 0 ? 600 : 400
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
