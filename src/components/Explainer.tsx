import { sampleSizePerArm } from '../lib/stats';
import type { AbParams } from '../types';

interface Props {
  params: AbParams;
  peekDay: number | null;
  finalPValue: number;
}

export function Explainer({ params, peekDay, finalPValue }: Props) {
  const nPerArm =
    params.trueUplift > 0
      ? sampleSizePerArm(params.baselineRate, params.trueUplift, params.alpha, 0.8)
      : null;
  const totalNeeded = nPerArm !== null && Number.isFinite(nPerArm) ? nPerArm * 2 : null;
  const currentTotal = params.dailyTrafficPerArm * params.days * 2;

  return (
    <section className="card" aria-labelledby="explainer-title">
      <h2 id="explainer-title" className="card-title">
        What&apos;s going on?
      </h2>

      <div className="explainer">
        <h3>The short version</h3>
        <p>
          An A/B test compares two button colours (or any two variants). You pick a significance
          level α — usually 5% — and only call a winner if the final p-value dips below it.{' '}
          <strong>Peeking</strong> means checking p every day and stopping the moment it looks
          significant. That quietly multiplies your chance of crowning a fake winner.
        </p>
        <ul>
          <li>
            When the true uplift is 0% (an A/A test), end-of-test false positives stay near α.
          </li>
          <li>Peeking every day can push that false-positive rate to 20–40%+ over a few weeks.</li>
          <li>
            A small real uplift needs a lot of traffic; without it, early “wins” are usually noise.
          </li>
        </ul>
      </div>

      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Final p-value</span>
          <span className="summary-value mono">{finalPValue.toFixed(4)}</span>
          <span className="summary-hint">
            {finalPValue < params.alpha ? 'Significant at end' : 'Not significant at end'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Peeker would stop</span>
          <span className="summary-value mono">
            {peekDay !== null ? `Day ${peekDay}` : 'Never'}
          </span>
          <span className="summary-hint">First day cumulative p &lt; α</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Traffic in this run</span>
          <span className="summary-value mono">{currentTotal.toLocaleString()}</span>
          <span className="summary-hint">Both arms combined</span>
        </div>
      </div>

      {nPerArm !== null && (
        <div className="sample-size" data-testid="sample-size">
          <h3>Sample-size check (80% power)</h3>
          <p>
            To detect a {(params.trueUplift * 100).toFixed(0)}% relative uplift from a{' '}
            {(params.baselineRate * 100).toFixed(1)}% baseline at α = {params.alpha} with 80% power,
            you need about <strong>{nPerArm.toLocaleString()}</strong> visitors per arm (
            {totalNeeded?.toLocaleString()} total). This simulation uses{' '}
            <strong>{currentTotal.toLocaleString()}</strong> total visitors
            {totalNeeded !== null && currentTotal < totalNeeded
              ? ' — underpowered, so early significance is shaky.'
              : ' — roughly enough traffic if you wait until the end.'}
          </p>
        </div>
      )}

      {params.trueUplift === 0 && (
        <div className="sample-size">
          <h3>Sample-size check</h3>
          <p>
            True uplift is 0%, so there is nothing to detect. Any “significant” result is a false
            positive. Use the peeking trap below to see how often that happens.
          </p>
        </div>
      )}
    </section>
  );
}
