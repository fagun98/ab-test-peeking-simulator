import { useMemo, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ConversionChart } from './components/ConversionChart';
import { Explainer } from './components/Explainer';
import { PeekingTrap } from './components/PeekingTrap';
import { PValueChart } from './components/PValueChart';
import { simulateAbTest } from './lib/stats';
import { DEFAULT_PARAMS, type AbParams } from './types';

export default function App() {
  const [params, setParams] = useState<AbParams>(DEFAULT_PARAMS);

  const simulation = useMemo(() => simulateAbTest(params), [params]);

  const resimulate = () => {
    setParams((prev) => ({
      ...prev,
      seed: ((prev.seed * 17 + 31) % 999) + 1,
    }));
  };

  const last = simulation.days[simulation.days.length - 1];

  return (
    <div className="app">
      <header>
        <p className="eyebrow">Interactive stats playground</p>
        <h1>Is that A/B test real?</h1>
        <p className="subtitle">
          Simulate a button-colour experiment and watch how peeking at p-values invents winners that
          aren&apos;t there.
        </p>
        <p className="model-info">
          Two-proportion z-test · client-side only · seeded &amp; reproducible
        </p>
      </header>

      <ControlPanel params={params} onChange={setParams} onResimulate={resimulate} />

      <div className="results-banner" data-testid="results-banner">
        <div>
          <span className="banner-label">Arm A</span>
          <span className="banner-value mono">
            {last ? `${(last.rateA * 100).toFixed(2)}%` : '—'}
          </span>
          <span className="banner-hint">
            {last
              ? `${last.conversionsA.toLocaleString()} / ${last.visitorsA.toLocaleString()}`
              : ''}
          </span>
        </div>
        <div>
          <span className="banner-label">Arm B</span>
          <span className="banner-value mono">
            {last ? `${(last.rateB * 100).toFixed(2)}%` : '—'}
          </span>
          <span className="banner-hint">
            {last
              ? `${last.conversionsB.toLocaleString()} / ${last.visitorsB.toLocaleString()}`
              : ''}
          </span>
        </div>
        <div>
          <span className="banner-label">Observed uplift</span>
          <span className="banner-value mono">
            {last && last.rateA > 0
              ? `${(((last.rateB - last.rateA) / last.rateA) * 100).toFixed(1)}%`
              : '—'}
          </span>
          <span className="banner-hint">
            True uplift{' '}
            {params.trueUplift === 0 ? '0%' : `+${(params.trueUplift * 100).toFixed(0)}%`}
          </span>
        </div>
      </div>

      <PValueChart days={simulation.days} alpha={params.alpha} peekDay={simulation.peekDay} />

      <ConversionChart
        days={simulation.days}
        trueRateA={simulation.trueRateA}
        trueRateB={simulation.trueRateB}
      />

      <Explainer
        params={params}
        peekDay={simulation.peekDay}
        finalPValue={simulation.finalPValue}
      />

      <PeekingTrap params={params} />

      <footer>
        <p>
          Built as a single-concept portfolio demo ·{' '}
          <a
            href="https://github.com/fagun98/ab-test-peeking-simulator"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
          {' · '}
          <a
            href="https://fagun98.github.io/llm-decoding-playground/"
            target="_blank"
            rel="noreferrer"
          >
            LLM Decoding Playground
          </a>
        </p>
      </footer>
    </div>
  );
}
