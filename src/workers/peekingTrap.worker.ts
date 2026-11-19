import { runPeekingTrap } from '../lib/stats';

export interface PeekingTrapWorkerInput {
  simulations: number;
  baselineRate: number;
  dailyTrafficPerArm: number;
  days: number;
  alpha: number;
  seed: number;
}

self.onmessage = (event: MessageEvent<PeekingTrapWorkerInput>) => {
  const input = event.data;
  const result = runPeekingTrap({
    ...input,
    onProgress: (done, total) => {
      self.postMessage({ type: 'progress', done, total });
    },
  });
  self.postMessage({ type: 'done', result });
};
