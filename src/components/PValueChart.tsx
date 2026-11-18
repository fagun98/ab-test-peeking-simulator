import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DaySnapshot } from '../lib/stats';

interface Props {
  days: DaySnapshot[];
  alpha: number;
  peekDay: number | null;
}

export function PValueChart({ days, alpha, peekDay }: Props) {
  const data = days.map((d) => ({
    day: d.day,
    pValue: d.pValue,
  }));

  const peekPoint = peekDay !== null ? data.find((d) => d.day === peekDay) : undefined;

  return (
    <section className="card chart-card" aria-labelledby="pvalue-title" data-testid="pvalue-chart">
      <h2 id="pvalue-title" className="card-title">
        Cumulative p-value (two-proportion z-test)
      </h2>
      <p className="card-subtitle">
        The dashed line is α = {alpha}. A peeker who stops at the first significant day would
        {peekDay !== null ? (
          <>
            {' '}
            have stopped on <strong>day {peekDay}</strong> and declared a winner.
          </>
        ) : (
          <> never have stopped — p stayed above α for the whole run.</>
        )}
      </p>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--grid-color)" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              label={{
                value: 'Day',
                position: 'insideBottom',
                offset: -2,
                fill: 'var(--text-secondary)',
              }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              tickFormatter={(v: number) => v.toFixed(2)}
              label={{
                value: 'p-value',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--text-secondary)',
              }}
            />
            <Tooltip
              formatter={(value: number) => [value.toFixed(4), 'p-value']}
              labelFormatter={(label) => `Day ${label}`}
              contentStyle={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
              }}
            />
            <ReferenceLine
              y={alpha}
              stroke="var(--danger)"
              strokeDasharray="6 4"
              label={{
                value: `α = ${alpha}`,
                fill: 'var(--danger)',
                position: 'insideTopRight',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="pValue"
              stroke="var(--accent-primary)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              name="p-value"
            />
            {peekPoint && (
              <ReferenceDot
                x={peekPoint.day}
                y={peekPoint.pValue}
                r={7}
                fill="var(--danger)"
                stroke="var(--bg-primary)"
                strokeWidth={2}
                label={{
                  value: 'Peeker stops here',
                  position: 'top',
                  fill: 'var(--danger)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
