import type { PipelineProgressEvent } from '@form-forge/core';

interface ProgressPanelProps {
  running: boolean;
  progress: PipelineProgressEvent[];
}

const PHASES = [
  { code: 'A', label: 'Analyze Template' },
  { code: 'B', label: 'Extract Data' },
  { code: 'C', label: 'Map Fields' },
  { code: 'D', label: 'Generate Output' },
] as const;

export const ProgressPanel = ({ running, progress }: ProgressPanelProps) => {
  const latest = progress[progress.length - 1];
  const currentPercent = latest?.percent ?? (running ? 5 : 0);
  const currentPhaseCode = latest?.phase;
  const currentPhaseIndex = currentPhaseCode
    ? PHASES.findIndex((phase) => phase.code === currentPhaseCode)
    : running
      ? 0
      : -1;

  if (!running || currentPercent >= 100) {
    return null;
  }

  return (
    <section className="card">
      <h2>Progress</h2>
      <div className="progress-header">
        <span>{running ? 'Running' : 'Idle'}</span>
        <span>{currentPercent}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={currentPercent}
      >
        <div className="progress-fill" style={{ width: `${currentPercent}%` }} />
      </div>
      <div className="progress-steps" aria-label="Pipeline phases">
        {PHASES.map((phase, index) => {
          const isComplete = index < currentPhaseIndex || currentPercent === 100;
          const isActive = index === currentPhaseIndex && running;
          const className = `progress-step${isComplete ? ' progress-step--complete' : ''}${isActive ? ' progress-step--active' : ''}`;

          return (
            <div className={className} key={phase.code}>
              <div className="progress-step-dot" />
              <div className="progress-step-label">{phase.label}</div>
            </div>
          );
        })}
      </div>
      <div className="progress-message">{latest?.message ?? (running ? 'Starting pipeline...' : 'Waiting to run')}</div>
    </section>
  );
};
