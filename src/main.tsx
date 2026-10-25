// Safeguard against third-party browser extensions (e.g. Phantom, MetaMask) throwing unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event) => {
      const isExtensionError =
        (event.filename &&
          (event.filename.includes('chrome-extension://') ||
            event.filename.includes('evmAsk.js') ||
            event.filename.includes('ethereum'))) ||
        (event.message &&
          (event.message.includes('Cannot redefine property: ethereum') ||
            event.message.includes('evmAsk')));

      if (isExtensionError) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
