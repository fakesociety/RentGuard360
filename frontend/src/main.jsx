/**
 * ============================================
 *  RentGuard 360 - main.jsx
 *  Application Entry Point
 * ============================================
 * 
 * PROVIDER HIERARCHY:
 * - StrictMode (React dev checks)
 * - GlobalErrorBoundary (error catching)
 * - BrowserRouter (routing)
 * - ThemeProvider (dark/light mode)
 * - LanguageProvider (i18n)
 * - AuthProvider (Cognito auth)
 * - App (main component)
 * 
 * ============================================
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import './styles/design-system.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </GlobalErrorBoundary>
  </StrictMode>,
);
