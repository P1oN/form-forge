type PipelineView = 'setup' | 'progress' | 'review' | 'fin';

interface PipelineStepperProps {
  current: PipelineView;
}

const STEPS: Array<{ id: PipelineView; label: string }> = [
  { id: 'setup', label: 'Setup' },
  { id: 'progress', label: 'Progress' },
  { id: 'review', label: 'Review' },
  { id: 'fin', label: 'Fin' },
];

export const PipelineStepper = ({ current }: PipelineStepperProps) => {
  const currentIndex = STEPS.findIndex((candidate) => candidate.id === current);

  return (
    <section className="card">
      <div className="pipeline-stepper" aria-label="Pipeline steps">
        {STEPS.map((step, index) => {
          const complete = index < currentIndex;
          const active = step.id === current;
          const className = `pipeline-step${complete ? ' pipeline-step--complete' : ''}${active ? ' pipeline-step--active' : ''}`;

          return (
            <div className={className} key={step.id}>
              <div className="pipeline-step-index">{index + 1}</div>
              <div className="pipeline-step-name">{step.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
