import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error("GLOBAL ERROR:", msg, "at", url, ":", lineNo, ":", columnNo, error);
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  console.error("UNHANDLED REJECTION:", event.reason);
});

console.log("ComVersa: Mounting app...");
(window as any).__COMVERSA_DEBUG__ = true;
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { NotificationProvider } from './components/Notification';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);
