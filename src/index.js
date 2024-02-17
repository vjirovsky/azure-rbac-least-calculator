import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

import './index.css';
const root = document.getElementById('root');

if (root !== null) {
  const appRoot = createRoot(root);
  appRoot.render(
    <StrictMode>
      <Router>
        <App />
      </Router>
    </StrictMode>
  );
}
