import type { FillPlan } from '@form-forge/core';

import type { ChangeEvent, InputHTMLAttributes } from 'react';

interface PreviewGridCardProps {
  entry: FillPlan['entries'][number];
  displayLabel: string;
  value: string | boolean | undefined;
  isActive: boolean;
  showDebugInfo: boolean;
  onValueChange: (value: string | boolean) => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onTogglePinned: () => void;
}

export const shouldTogglePinnedFromKey = (key: string): boolean => key === 'Enter' || key === ' ';

export const PreviewGridCard = ({
  entry,
  displayLabel,
  value,
  isActive,
  showDebugInfo,
  onValueChange,
  onHoverStart,
  onHoverEnd,
  onTogglePinned,
}: PreviewGridCardProps) => {
  const activeClassName = isActive ? 'preview-card--active' : '';

  return (
    <article
      role="button"
      tabIndex={0}
      className={`preview-card preview-card--button ${activeClassName}`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onTogglePinned}
      onKeyDown={(event) => {
        if (shouldTogglePinnedFromKey(event.key)) {
          event.preventDefault();
          onTogglePinned();
        }
      }}
      title={entry.fieldId}
    >
      <label className="preview-card-edit field-label" onClick={(event) => event.stopPropagation()}>
        <span className="truncate-line" title={displayLabel}>
          {displayLabel}:
        </span>
        <ValueInput fieldType={entry.fieldType} value={value} onValueChange={onValueChange} name={displayLabel} />
      </label>
      {showDebugInfo ? (
        <div className="debug-info-block field-id-muted">
          <div className="truncate-line">{entry.fieldId}</div>
          <div>Source: {entry.source.sourceHint}</div>
          <div>BBox: {entry.source.bbox ? entry.source.bbox.join(', ') : 'n/a'}</div>
        </div>
      ) : null}
    </article>
  );
};

type FieldType = FillPlan['entries'][number]['fieldType'];

type ValueByFieldType = {
  checkbox: boolean;
};

type ValueFor<T extends FieldType> =
  T extends keyof ValueByFieldType ? ValueByFieldType[T] : string;

type Props<T extends FieldType> = Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  fieldType: T;
  value: ValueFor<T> | undefined;
  onValueChange: (value: ValueFor<T>) => void;
};

function ValueInput<T extends FieldType>(props: Props<T>) {
  const { fieldType, ...rest } = props;
  if (fieldType === 'checkbox') {
      return <CheckboxInput {...rest as CheckboxProps}  />
  }  
  
    return <TextInput {...rest as TextProps} />
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value: boolean | undefined;
  onValueChange: (value: boolean) => void;
}

function CheckboxInput(props: CheckboxProps) {
  const { value, onValueChange } = props;
  
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    onValueChange(e.target.checked);
  }

  return (
    <input
      type="checkbox"
      checked={Boolean(value)}
      onChange={onChange}
      onMouseEnter={(event) => event.stopPropagation()}
      onMouseLeave={(event) => event.stopPropagation()}
    />
  )
}

interface TextProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string | undefined;
  onValueChange: (value: string) => void;
}

function TextInput(props: TextProps) {
  const { value, onValueChange } = props;
  
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    onValueChange(e.target.value);
  }

  return (
    <input
      type="text"
      value={String(value || '')}
      onChange={onChange}
      onMouseEnter={(event) => event.stopPropagation()}
      onMouseLeave={(event) => event.stopPropagation()}
    />
  )
}