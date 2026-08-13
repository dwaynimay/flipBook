export interface ProgressProps {
  readonly label: string;
  readonly value: number;
}

export function Progress({ label, value }: ProgressProps) {
  const boundedValue = Math.max(0, Math.min(value, 100));

  return (
    <div className="booklet-progress">
      <div className="booklet-progress__meta">
        <span>{label}</span>
        <span>{Math.round(boundedValue)}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(boundedValue)}
        className="booklet-progress__track"
        role="progressbar"
      >
        <span className="booklet-progress__value" style={{ width: `${boundedValue}%` }} />
      </div>
    </div>
  );
}
