import { BotId } from './common';

export type BotStatus = 'active' | 'paused' | 'alert';

export type BotProfile = 'Conservative' | 'Balanced' | 'Aggressive';

export interface BotExposure {
  pct: number;
  limitPct?: number;
}

export interface Bot {
  id: BotId;
  name: string;
  profile: BotProfile;
  status: BotStatus;
  returnPct: number;
  exposure: BotExposure;
  lastSignalSummary: string;
  lastSignalAt: string;
  strategyDescription: string;
}
