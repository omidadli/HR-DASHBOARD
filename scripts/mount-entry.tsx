import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';

/** Test entry: mounts the real App into whatever container it is handed. */
export function mount(el: HTMLElement) {
  const root = createRoot(el);
  root.render(<App />);
  return root;
}

// Imported separately so the splash watchdog can be exercised on its own.
export {SplashScreen} from '../src/components/common/SplashScreen';
