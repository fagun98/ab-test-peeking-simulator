import { AbParams, PRESETS } from '../types';

interface Props {
  params: AbParams;
  onChange: (next: AbParams) => void;
  onResimulate: () => void;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(value * 100 < 10 ? 1 : 0)}%`;
}

export function ControlPanel({ params, onChange, onResimulate }: Props) {
  const set = <K extends keyof AbParams>(key: K, value: AbParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <section className="card" aria-labelledby="controls-title">
      <h2 id="controls-title" className="card-title">
        Experiment setup
      </h2>

      <div className="preset-buttons" role="group" aria-label="Presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="btn"
            onClick={() => onChange({ ...params, ...preset.params })}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="controls-grid">
        <label className="control-group">
          <span className="control-label">
            Baseline conversion rate
            <span className="control-value">{pct(params.baselineRate)}</span>
          </span>
          <input
            className="slider"
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={params.baselineRate}
            onChange={(e) => set('baselineRate', Number(e.target.value))}
          />
          <span className="control-hint">Button A&apos;s true conversion rate</span>
        </label>

        <label className="control-group">
          <span className="control-label">
            True uplift (B vs A)
            <span className="control-value">
              {params.trueUplift === 0 ? '0% (A/A)' : `+${pct(params.trueUplift)}`}
            </span>
          </span>
          <input
            className="slider"
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={params.trueUplift}
            onChange={(e) => set('trueUplift', Number(e.target.value))}
          />
          <span className="control-hint">0% means no real difference — any “win” is noise</span>
        </label>

        <label className="control-group">
          <span className="control-label">
            Daily traffic per arm
            <span className="control-value">{params.dailyTrafficPerArm.toLocaleString()}</span>
          </span>
          <input
            className="slider"
            type="range"
            min={100}
            max={5000}
            step={100}
            value={params.dailyTrafficPerArm}
            onChange={(e) => set('dailyTrafficPerArm', Number(e.target.value))}
          />
        </label>

        <label className="control-group">
          <span className="control-label">
            Number of days
            <span className="control-value">{params.days}</span>
          </span>
          <input
            className="slider"
            type="range"
            min={7}
            max={90}
            step={1}
            value={params.days}
            onChange={(e) => set('days', Number(e.target.value))}
          />
        </label>

        <label className="control-group">
          <span className="control-label">
            Significance level α<span className="control-value">{params.alpha}</span>
          </span>
          <input
            className="slider"
            type="range"
            min={0.01}
            max={0.1}
            step={0.01}
            value={params.alpha}
            onChange={(e) => set('alpha', Number(e.target.value))}
          />
        </label>

        <label className="control-group">
          <span className="control-label">
            Random seed
            <span className="control-value">{params.seed}</span>
          </span>
          <input
            className="slider"
            type="range"
            min={1}
            max={999}
            step={1}
            value={params.seed}
            onChange={(e) => set('seed', Number(e.target.value))}
          />
          <span className="control-hint">Same seed → same visitors &amp; conversions</span>
        </label>
      </div>

      <div className="action-buttons">
        <button type="button" className="btn btn-primary" onClick={onResimulate}>
          Resimulate with new seed
        </button>
      </div>
    </section>
  );
}
