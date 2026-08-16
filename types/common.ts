/** Real bots have an arbitrary backend-issued id — no longer a closed set
 * of 3 fixed identities (that was the pre-Bot-API mock model). Signals/
 * Activity mock data still uses the strings 'sentinel'/'equilibrium'/
 * 'vortex' as flavor labels, but those no longer resolve to a real bot. */
export type BotId = string;

export type RiskLevel = 'normal' | 'elevated' | 'alert' | 'critical';
