/**
 * ============================================
 *  AdminSidebar
 *  Navigation Sidebar for Admin Panel
 * ============================================
 * 
 * STRUCTURE:
 * - Logo & back link
 * - Navigation items (Dashboard, Users, Analytics)
 * - Language/Theme toggles
 * - User profile & logout
 * 
 * PROPS:
 * - onNavigate: callback for mobile menu close
 * 
 * ============================================
 */
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './Toggle';
import LanguageToggle from './LanguageToggle';
import {
    LayoutDashboard,
    Users,
    BarChart3,
    Settings,
    Shield,
    LogOut,
    ArrowLeft
} from 'lucide-react';
import './AdminSidebar.css';

const AdminSidebar = ({ onNavigate }) => {
    const { userAttributes, logout } = useAuth();
    const { t } = useLanguage();
    const { isDark } = useTheme();

    const navItems = [
        {
            path: '/admin',
            icon: LayoutDashboard,
            label: t('admin.dashboard') || 'Dashboard',
            end: true
        },
        {
            path: '/admin/users',
            icon: Users,
            label: t('admin.usersTab') || 'Users'
        },
        {
            path: '/admin/analytics',
            icon: BarChart3,
            label: t('admin.analytics') || 'Analytics'
        }
    ];

    return (
        <aside className={`admin-sidebar ${isDark ? 'dark' : 'light'}`}>
            {/* Logo */}
            <div className="sidebar-header">
                <Link to="/dashboard" className="sidebar-logo" title={t('nav.backToDashboard') || 'Back to Dashboard'}>
                    <Shield className="logo-icon" />
                    <span className="logo-text">RentGuard</span>
                </Link>
            </div>

            {/* Back to Dashboard Link */}
            <div className="sidebar-back-link">
                <Link to="/dashboard" className="back-link" onClick={onNavigate}>
                    <ArrowLeft size={16} />
                    <span>{t('nav.backToDashboard') || 'Back to Dashboard'}</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            `sidebar-nav-item ${isActive ? 'active' : ''}`
                        }
                        onClick={onNavigate}
                    >
                        <item.icon className="nav-icon" size={20} />
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="sidebar-footer">
                {/* Language Toggle */}
                <div className="sidebar-control">
                    <LanguageToggle />
                </div>

                {/* Theme Toggle - Green iOS Style */}
                <div className="sidebar-control theme-control">
                    <ThemeToggle showLabel={true} />
                </div>

                {/* User Profile */}
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {userAttributes?.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{userAttributes?.name || 'Admin'}</span>
                        <span className="user-role">{t('admin.administrator') || 'Administrator'}</span>
                    </div>
                </div>

                {/* Logout */}
                <button
                    className="sidebar-footer-btn logout-btn"
                    onClick={logout}
                    title={t('nav.logout') || 'Logout'}
                >
                    <LogOut size={18} />
                    <span>{t('nav.logout') || 'Logout'}</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
