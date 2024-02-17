import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { MatomoProvider, createInstance } from '@datapunt/matomo-tracker-react'

import App from './App';

import './index.css';

const instance = createInstance({
  urlBase: 'https://matomo.vjirovsky.cz',
  siteId: 5,
  disabled: false, // optional, false by default. Makes all tracking calls no-ops if set to true.
  heartBeat: { // optional, enabled by default
    active: true, // optional, default value: true
    seconds: 10 // optional, default value: `15
  },
  linkTracking: true, // optional, default value: true
  configurations: { // optional, default value: {}
    // any valid matomo configuration, all below are optional
    disableCookies: true,
    setSecureCookie: true,
    setRequestMethod: 'POST'
  }
})



const root = document.getElementById('root');

if (root !== null) {
  const appRoot = createRoot(root);
  appRoot.render(
    <StrictMode>
      <Router>
        <MatomoProvider value={instance}>
          <App />
        </MatomoProvider>
      </Router>
    </StrictMode>
  );
}
