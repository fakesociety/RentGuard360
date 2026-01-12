/**
 * ============================================
 *  RentGuard 360 - App.jsx
 *  Main Application Shell
 * ============================================
 * 
 * This file contains:
 * - Top Navbar (Desktop & Mobile)
 * - Hamburger Mobile Menu
 * - Main Application Routing
 * - Footer (shown when authenticated)
 * 
 * NOTE: Footer.jsx is a shared component used here AND in LandingPage.jsx
 * NOTE: Admin pages use AdminLayout with sidebar (no main nav)
 * ============================================
 */
import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeToggle } from './components/Toggle';
import LanguageToggle from './components/LanguageToggle';
import Button from './components/Button';
import { Shield } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ContractsPage from './pages/ContractsPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import ContactPage from './pages/ContactPage';
import AdminLayout from './pages/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminAnalytics from './pages/AdminAnalytics';
import LandingPage from './pages/LandingPageNew';
import Footer from './components/Footer';
import './styles/design-system.css';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Modern Navigation Component
const Navigation = () => {
  const { logout, userAttributes, isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/dashboard', label: t('nav.dashboard') },
    { path: '/upload', label: t('nav.upload') },
    { path: '/contracts', label: t('nav.contracts') },
    ...(isAdmin ? [{ path: '/admin', label: t('nav.admin') }] : []),
  ];

  const getUserInitials = () => {
    const name = userAttributes?.name || userAttributes?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="nav-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="nav-inner">
        {/* Logo - Keep English */}
        <Link to="/dashboard" className="nav-logo">
          <Shield size={22} className="logo-icon" />
          <span className="logo-text">RentGuard 360</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
            >
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Right Side - Language Toggle, Theme Toggle & Profile */}
        <div className="nav-right">
          <LanguageToggle />
          <ThemeToggle />

          {/* Profile Dropdown */}
          <div className="profile-container" ref={profileRef}>
            <button
              className="profile-button"
              onClick={() => {
                setShowMobileMenu(false); // Close mobile menu when opening profile
                setShowProfileMenu(!showProfileMenu);
              }}
            >
              <div className="profile-avatar">{getUserInitials()}</div>
              <span className="profile-chevron">{showProfileMenu ? '▲' : '▼'}</span>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="profile-avatar-large">{getUserInitials()}</div>
                  <div className="profile-info">
                    <p className="profile-name">{userAttributes?.name || t('common.user')}</p>
                    <p className="profile-email">{userAttributes?.email}</p>
                  </div>
                </div>
                <div className="profile-divider"></div>
                <Link to="/contact" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  {t('nav.contact')}
                </Link>
                <Link to="/settings" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  {t('nav.settings')}
                </Link>
                <button className="profile-menu-item logout" onClick={handleLogout}>
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-button"
            onClick={() => {
              setShowProfileMenu(false); // Close profile when opening mobile menu
              setShowMobileMenu(!showMobileMenu);
            }}
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="mobile-menu">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-menu-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => setShowMobileMenu(false)}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState(() => {
    try {
      const raw = sessionStorage.getItem('rg_toast');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.createdAt && parsed?.ttlMs) {
        const remaining = (parsed.createdAt + parsed.ttlMs) - Date.now();
        if (remaining > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const toastTimerRef = useRef(null);

  // Check if current route is an admin page
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleToast = (event) => {
      const nextToast = event?.detail;
      if (!nextToast) return;
      setToast(nextToast);
    };

    window.addEventListener('rg:toast', handleToast);
    return () => window.removeEventListener('rg:toast', handleToast);
  }, []);

  useEffect(() => {
    // Best-effort cleanup of expired persisted toast (no state updates here)
    try {
      const raw = sessionStorage.getItem('rg_toast');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.createdAt && parsed?.ttlMs) {
        const remaining = (parsed.createdAt + parsed.ttlMs) - Date.now();
        if (remaining <= 0) sessionStorage.removeItem('rg_toast');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!toast) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    const createdAt = typeof toast.createdAt === 'number' ? toast.createdAt : Date.now();
    const ttlMs = typeof toast.ttlMs === 'number' ? toast.ttlMs : 5500;
    const remaining = (createdAt + ttlMs) - Date.now();
    const delay = Math.max(250, remaining);

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
      try {
        const raw = sessionStorage.getItem('rg_toast');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id && toast?.id && parsed.id === toast.id) {
            sessionStorage.removeItem('rg_toast');
          }
        }
      } catch {
        // ignore
      }
    }, delay);

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [toast]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading RentGuard 360...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {toast && (
        <div className="app-toast" role="status" aria-live="polite">
          <span className="app-toast__icon" aria-hidden="true">✓</span>
          <div className="app-toast__text">
            <div className="app-toast__title">{toast.title}</div>
            {toast.message && <div className="app-toast__subtitle">{toast.message}</div>}
          </div>
        </div>
      )}
      {/* Hide main nav on admin pages - admin has its own sidebar */}
      {isAuthenticated && !isAdminRoute && <Navigation />}

      <main className={`app-main ${isAdminRoute ? 'admin-page' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
          <Route path="/analysis/:contractId" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />

          {/* Admin routes with sidebar layout */}
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </main>

      {/* Hide footer on admin pages */}
      {isAuthenticated && !isAdminRoute && <Footer />}
    </div>
  );
}

export default App;

