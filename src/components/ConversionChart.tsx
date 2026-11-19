import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DaySnapshot } from '../lib/stats';

interface Props {
  days: DaySnapshot[];
  trueRateA: number;
  trueRateB: number;
}

export function ConversionChart({ days, trueRateA, trueRateB }: Props) {
  const data = days.map((d) => ({
    day: d.day,
    rateA: d.rateA,
    rateB: d.rateB,
    ciALow: d.ciA.lower,
    ciASpan: Math.max(0, d.ciA.upper - d.ciA.lower),
    ciBLow: d.ciB.lower,
    ciBSpan: Math.max(0, d.ciB.upper - d.ciB.lower),
  }));

  const maxRate = Math.max(
    ...days.map((d) => Math.max(d.ciA.upper, d.ciB.upper)),
    trueRateA,
    trueRateB,
  );
  const yMax = Math.min(1, Math.ceil(maxRate * 100) / 100 + 0.02);

  return (
    <section className="card chart-card" aria-labelledby="cr-title" data-testid="conversion-chart">
      <h2 id="cr-title" className="card-title">
        Cumulative conversion rates
      </h2>
      <p className="card-subtitle">
        Shaded bands are 95% Wald confidence intervals. True rates:{' '}
        <span className="swatch swatch-a">A {(trueRateA * 100).toFixed(1)}%</span>
        {' · '}
        <span className="swatch swatch-b">B {(trueRateB * 100).toFixed(1)}%</span>
      </p>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
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
              domain={[0, yMax]}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              label={{
                value: 'Conversion rate',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--text-secondary)',
              }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (
                  name === 'ciALow' ||
                  name === 'ciASpan' ||
                  name === 'ciBLow' ||
                  name === 'ciBSpan'
                ) {
                  return [null, null];
                }
                return [`${(value * 100).toFixed(2)}%`, name === 'rateA' ? 'Arm A' : 'Arm B'];
              }}
              labelFormatter={(label) => `Day ${label}`}
              contentStyle={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="ciALow"
              stackId="cia"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="ciASpan"
              stackId="cia"
              stroke="none"
              fill="var(--arm-a)"
              fillOpacity={0.18}
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="ciBLow"
              stackId="cib"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="ciBSpan"
              stackId="cib"
              stroke="none"
              fill="var(--arm-b)"
              fillOpacity={0.18}
              isAnimationActive={false}
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="rateA"
              stroke="var(--arm-a)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              name="rateA"
            />
            <Line
              type="monotone"
              dataKey="rateB"
              stroke="var(--arm-b)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              name="rateB"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
