import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';

/* ---- Server config + auth ---- */
const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [token, setTok] = useState(getToken());
  const [error, setError] = useState('');

  const loadConfig = useCallback(() => api('/api/config').then(setConfig).catch((e) => setError(e.message)), []);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const signOut = useCallback(() => { setToken(''); setTok(''); }, []);
  useEffect(() => { setUnauthorizedHandler(signOut); }, [signOut]);

  const signIn = useCallback(async (value) => {
    await api('/api/lots', { token: value });   // throws on 401
    setToken(value); setTok(value);
  }, []);

  const value = useMemo(() => ({
    config, error, reloadConfig: loadConfig,
    authed: config ? (config.mode !== 'production' || Boolean(token)) : false,
    ready: Boolean(config), signIn, signOut,
  }), [config, error, loadConfig, token, signIn, signOut]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

/* ---- Certificates list, shared by Dashboard and Certificates ---- */
const LotsCtx = createContext(null);
export const useLots = () => useContext(LotsCtx);

export function LotsProvider({ children }) {
  const [lots, setLots] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(() => api('/api/lots').then((d) => { setLots(d); setError(''); }).catch((e) => setError(e.message)), []);
  useEffect(() => { refresh(); }, [refresh]);
  const value = useMemo(() => ({ lots, error, refresh }), [lots, error, refresh]);
  return <LotsCtx.Provider value={value}>{children}</LotsCtx.Provider>;
}
