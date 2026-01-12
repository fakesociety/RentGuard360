import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Menu, X, Shield } from 'lucide-react';
import './AdminLayout.css';

/**
 * AdminLayout - Wrapper component for admin pages
 * Provides sidebar navigation and main content area with mobile menu
 */
const AdminLayout = () => {
    const { isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div
            className={`admin-layout ${isDark ? 'dark' : 'light'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Mobile Top Bar */}
            <div className="mobile-top-bar">
                <div className="mobile-logo">
                    <Shield size={24} />
                    <span>RentGuard</span>
                </div>
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* Sidebar - visible on desktop, toggleable on mobile */}
            <div className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`}>
                <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </div>

            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
