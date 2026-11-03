import React from 'react';
import { ArrowRight, Cloud, Laptop, TrendingUp } from 'lucide-react';

interface BenchmarkCardProps { totalFiles: number; cloudDurationSec: number; speedupFactor: number; }

export const BenchmarkCard: React.FC<BenchmarkCardProps> = ({ totalFiles, cloudDurationSec, speedupFactor }) => {
  const localSeconds = Math.round(totalFiles * 8.2);
  return (
    <section className="panel benchmark" aria-labelledby="benchmark-title">
      <div className="panel-header">
        <div>
          <div className="panel-kicker">03 · Comparison</div>
          <h2 id="benchmark-title" className="panel-title">Execution benchmark</h2>
          <p className="panel-description">Compare local serial processing with the current serverless batch.</p>
        </div>
        <div className="speedup-chip"><TrendingUp size={14} /> {speedupFactor ? `${speedupFactor}× faster` : 'Awaiting result'}</div>
      </div>
      <div className="benchmark-body">
        <article className="execution-card local">
          <div className="execution-card-title"><Laptop size={17} /><span>Local serial</span></div>
          <p>One document at a time on the local machine.</p>
          <div className="execution-values"><div><span className="metric-label">Estimated runtime</span><strong>{totalFiles ? `${localSeconds}s` : '—'}</strong></div><div><span className="metric-label">Local CPU</span><strong>High</strong></div></div>
        </article>
        <div className="benchmark-arrow"><ArrowRight size={20} /></div>
        <article className="execution-card cloud">
          <div className="execution-card-title"><Cloud size={17} /><span>Serverless fan-out</span></div>
          <p>Independent workers execute each document concurrently.</p>
          <div className="execution-values"><div><span className="metric-label">Batch runtime</span><strong>{cloudDurationSec ? `${cloudDurationSec.toFixed(1)}s` : '—'}</strong></div><div><span className="metric-label">Local CPU</span><strong>Offloaded</strong></div></div>
        </article>
      </div>
      <div className="benchmark-footnote">Speedup compares the accumulated worker duration with wall-clock batch duration. It is a batch metric, not a throughput guarantee.</div>
    </section>
  );
};
