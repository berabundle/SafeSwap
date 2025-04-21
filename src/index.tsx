import React from 'react';
import ReactDOM from 'react-dom/client';
import { SafeAppProvider } from '@safe-global/safe-apps-sdk';
import { SafeThemeProvider } from '@safe-global/safe-apps-react-sdk';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <SafeThemeProvider>
      <App />
    </SafeThemeProvider>
  </React.StrictMode>
);