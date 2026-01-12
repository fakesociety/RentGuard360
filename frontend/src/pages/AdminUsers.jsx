/**
 * ============================================
 *  AdminUsers
 *  User Management for Administrators
 * ============================================
 * 
 * STRUCTURE:
 * - Search & filter controls
 * - Sortable users table
 * - Action buttons (disable, enable, delete)
 * - Confirmation modals
 * 
 * FEATURES:
 * - Search by email or name
 * - Filter by status (all/enabled/disabled)
 * - Column sorting (email, name, status, date)
 * - Enable/disable users with reason
 * - Delete users with double confirmation
 * 
 * DEPENDENCIES:
 * - api.js: getUsers, disableUser, enableUser, deleteUser
 * - ReactDOM.createPortal for modals
 * 
 * ============================================
 */
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUsers, disableUser, enableUser, deleteUser } from '../services/api';
import Button from '../components/Button';
import {
    Search,
    Ban,
    Check,
    Trash2,
    Users,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import './AdminDashboard.css';

const AdminUsers = () => {
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    // Modal state
    const [modal, setModal] = useState({
        isOpen: false,
        type: null,
        username: null,
        title: '',
        message: '',
    });

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    const fetchAllUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUsers('');
            setAllUsers(data.users || []);
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const filterAndSortUsers = useCallback(() => {
        let filtered = [...allUsers];

        // 1. Filter
        if (statusFilter === 'enabled') {
            filtered = filtered.filter(user => user.enabled);
        } else if (statusFilter === 'disabled') {
            filtered = filtered.filter(user => !user.enabled);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                (user.email?.toLowerCase().includes(query)) ||
                (user.name?.toLowerCase().includes(query))
            );
        }

        // 2. Sort
        filtered.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Handle nulls safely
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            // Use localeCompare for strings (Case Insensitive & Language Aware)
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'asc'
                    ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
                    : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
            }

            // Normal compare for numbers/booleans
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        setUsers(filtered);
    }, [allUsers, searchQuery, sortConfig, statusFilter]);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    useEffect(() => {
        if (allUsers.length > 0) {
            filterAndSortUsers();
        }
    }, [allUsers.length, filterAndSortUsers]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    

    const getSortIcon = (columnKey) => {
        const isActive = sortConfig.key === columnKey;
        return (
            <span className={`sort-icon ${isActive ? sortConfig.direction : 'inactive'}`}>
                {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
            </span>
        );
    };

    // ... (rest of action handlers remain same)

    const handleDisableUser = async (username) => {
        setModal({
            isOpen: true,
            type: 'disable',
            username,
            title: t('admin.confirmDisableTitle') || 'Disable User',
            message: t('admin.confirmDisable'),
        });
    };

    const handleEnableUser = async (username) => {
        setActionLoading(username);
        try {
            await enableUser(username);
            fetchAllUsers();
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                username: null,
                title: t('common.error') || 'Error',
                message: err.message,
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (username) => {
        setModal({
            isOpen: true,
            type: 'delete',
            username,
            title: t('admin.confirmDeleteTitle') || 'Delete User',
            message: t('admin.confirmDelete'),
        });
    };

    const handleModalConfirm = async () => {
        const { type, username } = modal;
        setModal({ ...modal, isOpen: false });

        if (type === 'disable') {
            setActionLoading(username);
            try {
                await disableUser(username, 'Admin action');
                fetchAllUsers();
            } catch (err) {
                setModal({
                    isOpen: true,
                    type: 'error',
                    username: null,
                    title: t('common.error') || 'Error',
                    message: err.message,
                });
            } finally {
                setActionLoading(null);
            }
        } else if (type === 'delete') {
            setModal({
                isOpen: true,
                type: 'deleteConfirm',
                username,
                title: t('admin.confirmDeleteFinalTitle') || 'Final Confirmation',
                message: t('admin.confirmDeleteFinal'),
            });
        } else if (type === 'deleteConfirm') {
            setActionLoading(username);
            try {
                await deleteUser(username);
                fetchAllUsers();
            } catch (err) {
                setModal({
                    isOpen: true,
                    type: 'error',
                    username: null,
                    title: t('common.error') || 'Error',
                    message: err.message,
                });
            } finally {
                setActionLoading(null);
            }
        }
    };

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const getUserStatusPresentation = (user) => {
        const rawStatus = String(user?.status || '').toUpperCase();

        if (!user?.enabled) {
            return {
                badgeClass: 'disabled',
                label: t('admin.suspended') || 'Suspended',
            };
        }

        // Cognito may return UNCONFIRMED before email verification.
        if (rawStatus && rawStatus !== 'CONFIRMED') {
            return {
                badgeClass: 'pending',
                label: t('admin.pendingVerification') || (isRTL ? 'ממתין לאימות' : 'Pending verification'),
            };
        }

        return {
            badgeClass: 'active',
            label: t('admin.active') || 'Active',
        };
    };

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>
                    <Users size={28} style={{ marginInlineEnd: '12px' }} />
                    {t('admin.usersTab') || 'User Management'}
                </h1>
            </header>

            <div className="admin-content">
                {error && (
                    <div className="error-banner">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                        <Button variant="secondary" size="small" onClick={fetchAllUsers}>
                            <RefreshCw size={14} />
                            {t('admin.tryAgain')}
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : (
                    <div className="users-tab">
                        {/* Search and Filters */}
                        <div className="users-controls">
                            <div className="search-container">
                                <Search className="search-icon" size={16} />
                                <input
                                    type="text"
                                    placeholder={t('admin.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                            </div>

                            <div className="status-filter-buttons">
                                <button
                                    className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                                    onClick={() => setStatusFilter('all')}
                                >
                                    {t('admin.allUsers')}
                                </button>
                                <button
                                    className={`filter-btn ${statusFilter === 'enabled' ? 'active' : ''}`}
                                    onClick={() => setStatusFilter('enabled')}
                                >
                                    <span className="status-indicator active"></span>
                                    {t('admin.activeOnly')}
                                </button>
                                <button
                                    className={`filter-btn ${statusFilter === 'disabled' ? 'active' : ''}`}
                                    onClick={() => setStatusFilter('disabled')}
                                >
                                    <span className="status-indicator disabled"></span>
                                    {t('admin.disabledOnly')}
                                </button>
                            </div>
                        </div>

                        {/* Users Table */}
                        <div className="users-table-wrapper">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('email')} className="sortable-header">
                                            <div className="th-content">
                                                {t('admin.email')}
                                                {getSortIcon('email')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="sortable-header">
                                            <div className="th-content">
                                                {t('admin.name')}
                                                {getSortIcon('name')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('enabled')} className="sortable-header">
                                            <div className="th-content">
                                                {t('admin.status')}
                                                {getSortIcon('enabled')}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('createdAt')} className="sortable-header">
                                            <div className="th-content">
                                                {t('admin.joined')}
                                                {getSortIcon('createdAt')}
                                            </div>
                                        </th>
                                        <th>{t('admin.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="no-data">{t('admin.noUsers')}</td>
                                        </tr>
                                    ) : (
                                        users.map(user => {
                                            const statusPresentation = getUserStatusPresentation(user);
                                            return (
                                            <tr key={user.username} className={`user-row ${!user.enabled ? 'disabled-user' : ''}`}>
                                                <td>{user.email || '—'}</td>
                                                <td>{user.name || '—'}</td>
                                                <td>
                                                    <span className={`status-badge ${statusPresentation.badgeClass}`}>
                                                        <span className="status-dot"></span>
                                                        {statusPresentation.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {user.createdAt
                                                        ? new Date(user.createdAt).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                                                        : '—'
                                                    }
                                                </td>
                                                <td className="actions-cell">
                                                    <div className="action-buttons">
                                                        {user.enabled ? (
                                                            <button
                                                                className="action-icon-btn danger"
                                                                onClick={() => handleDisableUser(user.username)}
                                                                disabled={actionLoading === user.username}
                                                                title={t('admin.disable')}
                                                            >
                                                                {actionLoading === user.username ? '...' : <Ban size={16} />}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="action-icon-btn success"
                                                                onClick={() => handleEnableUser(user.username)}
                                                                disabled={actionLoading === user.username}
                                                                title={t('admin.enable')}
                                                            >
                                                                {actionLoading === user.username ? '...' : <Check size={16} />}
                                                            </button>
                                                        )}
                                                        <button
                                                            className="action-icon-btn danger"
                                                            onClick={() => handleDeleteUser(user.username)}
                                                            disabled={actionLoading === user.username}
                                                            title={t('admin.delete')}
                                                        >
                                                            {actionLoading === user.username ? '...' : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p className="users-count">
                            {t('admin.showingUsers')?.replace('{count}', users.length) || `Showing ${users.length} users`}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal - rendered via Portal for full screen overlay */}
            {modal.isOpen && ReactDOM.createPortal(
                <div className={`admin-modal-overlay ${isDark ? 'dark' : 'light'}`} onClick={closeModal}>
                    <div className={`admin-modal ${isDark ? 'dark' : 'light'} ${modal.type === 'error' ? 'modal-error' : 'modal-warning'}`} onClick={e => e.stopPropagation()}>
                        <h3>{modal.title}</h3>
                        <p>{modal.message}</p>
                        <div className="modal-actions">
                            {modal.type === 'error' ? (
                                <Button variant="primary" onClick={closeModal}>
                                    {t('common.ok') || 'OK'}
                                </Button>
                            ) : (
                                <>
                                    <Button variant="secondary" onClick={closeModal}>
                                        {t('common.cancel') || 'Cancel'}
                                    </Button>
                                    <Button
                                        variant={modal.type === 'deleteConfirm' ? 'danger' : 'primary'}
                                        onClick={handleModalConfirm}
                                    >
                                        {t('common.confirm') || 'Confirm'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminUsers;
