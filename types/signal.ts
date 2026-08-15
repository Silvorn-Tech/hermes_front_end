import { BotId } from './common';

/** Ordered from quietest to loudest. */
export type SignalLevel = 'ambient' | 'insight' | 'signal' | 'alert' | 'action_required';

export type SignalSource = 'sentinel' | 'equilibrium' | 'vortex' | 'risk' | 'system';

export interface Signal {
  id: string;
  level: SignalLevel;
  source: SignalSource;
  botId?: BotId;
  /** Short summary, e.g. shown in the dashboard Signal Strip. */
  headline: string;
  /** Interpretation of the underlying events — the "why", not just the "what". */
  body: string;
  timestamp: string;
  /** ActivityEvent ids this signal was derived from. */
  relatedEventIds: string[];
  actionLabel?: string;
}
