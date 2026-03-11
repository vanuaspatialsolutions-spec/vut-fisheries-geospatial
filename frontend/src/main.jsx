import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        richColors
        expand={false}
        visibleToasts={5}
        duration={4000}
        toastOptions={{
          classNames: {
            toast: 'rounded-lg! font-sans! text-sm!',
          },
        }}
      />
    </HashRouter>
  </React.StrictMode>
);
