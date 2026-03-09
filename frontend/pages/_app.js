import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Optional runtime config file for production deployments.
    fetch('/config.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg && typeof window !== 'undefined') {
          window.__APP_CONFIG = cfg;
        }
      })
      .catch(() => {});
  }, []);

  return <Component {...pageProps} />;
}
