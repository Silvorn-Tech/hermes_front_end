import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/api';

export type BinanceAccountStatus = 'loading' | 'not-connected' | 'connected' | 'failed';

/**
 * Read-only status hook, extracted from Settings' `BinanceAccountSection`
 * so any other screen that needs to know "does this user have a
 * connected, verified Binance account" (e.g. the bot-detail Activate LIVE
 * flow) can share one fetch instead of duplicating it. Settings' own
 * connect/disconnect mutation UI stays local to that screen — this hook
 * only ever reads.
 */
export function useBinanceAccountStatus() {
  const [status, setStatus] = useState<BinanceAccountStatus>('loading');
  const [apiKeyLast4, setApiKeyLast4] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  const reload = useCallback(() => {
    setStatus('loading');
    apiClient
      .getBinanceCredentialStatus()
      .then((result) => {
        if (result.configured) {
          setApiKeyLast4(result.apiKeyLast4);
          setVerifiedAt(result.verifiedAt);
          setStatus('connected');
        } else {
          setApiKeyLast4(null);
          setVerifiedAt(null);
          setStatus('not-connected');
        }
      })
      .catch(() => setStatus('failed'));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { status, apiKeyLast4, verifiedAt, reload };
}
