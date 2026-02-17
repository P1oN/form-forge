import { GlobalWorkerOptions } from 'pdfjs-dist';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles/app.css';

GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
