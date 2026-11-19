import { useEffect, useRef, useState } from 'react';
import type { PeekingTrapResult } from '../lib/stats';
import type { AbParams } from '../types';

interface Props {
  params: AbParams;
}

const DEFAULT_SIMS = 1000;

export function PeekingTrap({ params }: Props) {
  const [sims, setSims] = useState(DEFAULT_SIMS);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PeekingTrapResult | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = () => {
    workerRef.current?.terminate();
    setRunning(true);
    setProgress(0);
    setResult(null);

    const worker = new Worker(new URL('../workers/peekingTrap.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: 'progress'; done: number; total: number }
        | { type: 'done'; result: PeekingTrapResult };

      if (data.type === 'progress') {
        setProgress(data.done / data.total);
      } else {
        setResult(data.result);
        setRunning(false);
        setProgress(1);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setRunning(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({
      simulations: sims,
      baselineRate: params.baselineRate,
      dailyTrafficPerArm: params.dailyTrafficPerArm,
      days: params.days,
      alpha: params.alpha,
      seed: params.seed + 10000,
    });
  };

  const endPct = result ? (result.endOnlyRate * 100).toFixed(1) : null;
  const peekPct = result ? (result.peekingRate * 100).toFixed(1) : null;
  const maxBar = result
    ? Math.max(result.endOnlyRate, result.peekingRate, params.alpha)
    : params.alpha;

  return (
    <section className="card" aria-labelledby="trap-title" data-testid="peeking-trap">
      <h2 id="trap-title" className="card-title">
        Peeking trap
      </h2>
      <p className="card-subtitle">
        Run many A/A tests (true uplift = 0%). Checking once at the end should false-alarm about α
        of the time. Checking every day and stopping at the first p &lt; α inflates that rate a lot.
      </p>

      <div className="trap-controls">
        <label className="control-group trap-sims">
          <span className="control-label">
            Simulations
            <span className="control-value">{sims.toLocaleString()}</span>
          </span>
          <input
            className="slider"
            type="range"
            min={200}
            max={2000}
            step={100}
            value={sims}
            disabled={running}
            onChange={(e) => setSims(Number(e.target.value))}
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={run} disabled={running}>
          {running ? 'Running…' : 'Run A/A peeking experiment'}
        </button>
      </div>

      {running && (
        <div className="progress-bar" aria-label="Simulation progress">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {result && (
        <div className="trap-results" data-testid="peeking-trap-results">
          <div className="trap-headline">
            <div className="trap-stat">
              <span className="trap-stat-label">Check once at the end</span>
              <span className="trap-stat-value">{endPct}%</span>
              <span className="trap-stat-hint">
                {result.endOnlyFalsePositives.toLocaleString()} /{' '}
                {result.simulations.toLocaleString()} false winners · expected ≈{' '}
                {(params.alpha * 100).toFixed(0)}%
              </span>
            </div>
            <div className="trap-stat trap-stat-warn">
              <span className="trap-stat-label">Peek every day</span>
              <span className="trap-stat-value">{peekPct}%</span>
              <span className="trap-stat-hint">
                {result.peekingFalsePositives.toLocaleString()} /{' '}
                {result.simulations.toLocaleString()} false winners · much higher than α
              </span>
            </div>
          </div>

          <div className="trap-bars" role="img" aria-label="False positive rate comparison">
            <div className="trap-bar-row">
              <span className="trap-bar-label">End only</span>
              <div className="trap-bar-track">
                <div
                  className="trap-bar-fill trap-bar-end"
                  style={{ width: `${(result.endOnlyRate / maxBar) * 100}%` }}
                />
              </div>
              <span className="trap-bar-pct">{endPct}%</span>
            </div>
            <div className="trap-bar-row">
              <span className="trap-bar-label">Peeking</span>
              <div className="trap-bar-track">
                <div
                  className="trap-bar-fill trap-bar-peek"
                  style={{ width: `${(result.peekingRate / maxBar) * 100}%` }}
                />
              </div>
              <span className="trap-bar-pct">{peekPct}%</span>
            </div>
            <div className="trap-bar-row trap-bar-alpha">
              <span className="trap-bar-label">α target</span>
              <div className="trap-bar-track">
                <div
                  className="trap-bar-fill trap-bar-alpha-fill"
                  style={{ width: `${(params.alpha / maxBar) * 100}%` }}
                />
              </div>
              <span className="trap-bar-pct">{(params.alpha * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
