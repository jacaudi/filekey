import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SessionProvider } from './state/session';
import { ThemeProvider } from './theme';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
