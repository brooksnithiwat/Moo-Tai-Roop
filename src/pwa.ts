/* Service worker from vite-plugin-pwa: caches the app for offline use and updates itself on the next visit. */
import { registerSW } from 'virtual:pwa-register';

export function registerPWA() {
  if (import.meta.env.DEV) return;
  registerSW({ immediate: true });
}
