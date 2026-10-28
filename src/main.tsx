import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { S, commit, onCommit } from './lib/store';
import { flushSave, hydrate, loadLocal, scheduleSave } from './lib/persist';
import * as Drive from './lib/drive';
import { registerPWA } from './pwa';

// Every change saves locally, then pushes to Drive when signed in.
onCommit(() => scheduleSave(() => Drive.queuePush(commit)));
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

(async () => {
  try { hydrate(await loadLocal()); } catch (e) { console.warn(e); }
  S.loaded = true;
  commit();
  registerPWA();
})();
