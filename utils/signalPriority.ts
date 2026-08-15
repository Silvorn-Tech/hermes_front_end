import { Signal, SignalLevel } from '../types';

const priority: Record<SignalLevel, number> = {
  action_required: 4,
  alert: 3,
  signal: 2,
  insight: 1,
  ambient: 0,
};

/** Most urgent signal first, then most recent. Used to pick what surfaces in the Dashboard Signal Strip. */
export function pickTopSignal(signals: Signal[]): Signal | undefined {
  return [...signals].sort((a, b) => {
    const diff = priority[b.level] - priority[a.level];
    if (diff !== 0) return diff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  })[0];
}
