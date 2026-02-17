import type { PipelineProgressEvent } from '@form-forge/core';

interface ProgressPanelProps {
  running: boolean;
  progress: PipelineProgressEvent[];
}

export const ProgressPanel = ({ running, progress }: ProgressPanelProps) => {
  return (
    <section className="card">
      <h2>Progress</h2>
      <div>Status: {running ? 'Running' : 'Idle'}</div>
      <ol>
        {progress.map((item, idx) => (
          <li key={`${item.phase}-${idx}`}>
            [{item.phase}] {item.percent}% - {item.message}
          </li>
        ))}
      </ol>
    </section>
  );
};
