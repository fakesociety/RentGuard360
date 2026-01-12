/**
 * ============================================
 *  SettingsPage
 *  User Account Settings & Preferences
 * ============================================
 * 
 * STRUCTURE:
 * - Profile section (name, email)
 * - Appearance section (dark mode toggle)
 * - Notifications section
 * - About section
 * - Danger zone (logout, delete account)
 * 
 * FEATURES:
 * - Theme toggle (light/dark)
 * - Account deletion with confirmation
 * - Deletes all user contracts before account
 * 
 * DEPENDENCIES:
 * - api.js: deleteAllUserContracts
 * - AuthContext: logout, deleteAccount
 * - ThemeContext: isDark, toggleTheme
 * 
 * ============================================
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { deleteAllUserContracts } from '../services/api'; // DAN DID IT - Import for deleting contracts
import Card from '../components/Card';
import Button from '../components/Button';
import Toggle from '../components/Toggle';
import './SettingsPage.css';

const SettingsPage = () => {
    const { userAttributes, logout, deleteAccount, user } = useAuth(); // DAN DID IT - Added deleteAccount and user
    const { isDark, toggleTheme } = useTheme();
    const { t, isRTL } = useLanguage();

    // DAN DID IT - State for delete account confirmation
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleLogout = async () => {
        await logout();
    };

    // DAN DID IT - Handle account deletion with contract cleanup
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setDeleteError(isRTL ? 'יש להקליד DELETE כדי לאשר' : 'Please type DELETE to confirm');
            return;
        }

        setIsDeleting(true);
        setDeleteError('');

        try {
            // Step 1: Delete all user's contracts
            const userId = user?.username || user?.userId;
            if (userId) {
                await deleteAllUserContracts(userId);
            }

            // Step 2: Delete the user's Cognito account
            const result = await deleteAccount();

            if (result.success) {
                // User is automatically logged out after deleteAccount
                // Redirect happens via AuthContext
            } else {
                setDeleteError(result.error || t('account.deleteAccountError'));
                setIsDeleting(false);
            }
        } catch (error) {
            console.error('Delete account error:', error);
            setDeleteError(t('account.deleteAccountError'));
            setIsDeleting(false);
        }
    };

    return (
        <div className="settings-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <h1 className="settings-title animate-fadeIn">{isRTL ? 'הגדרות' : 'Settings'}</h1>

            {/* Profile Section */}
            <section className="settings-section animate-slideUp">
                <h2 className="section-title">👤 {isRTL ? 'פרופיל' : 'Profile'}</h2>
                <Card variant="elevated" padding="lg">
                    <div className="profile-info-grid">
                        <div className="profile-avatar-large">
                            {(userAttributes?.name || userAttributes?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="profile-details">
                            <div className="info-row">
                                <span className="info-label">{isRTL ? 'שם' : 'Name'}</span>
                                <span className="info-value">{userAttributes?.name || (isRTL ? 'לא הוגדר' : 'Not set')}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">{isRTL ? 'אימייל' : 'Email'}</span>
                                <span className="info-value">{userAttributes?.email}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Appearance Section */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '100ms' }}>
                <h2 className="section-title">🎨 {isRTL ? 'תצוגה' : 'Appearance'}</h2>
                <Card variant="elevated" padding="lg">
                    <div className="setting-row">
                        <div className="setting-info">
                            <h3>{isRTL ? 'מצב כהה' : 'Dark Mode'}</h3>
                            <p>{isRTL ? 'החלפה בין ערכות נושא בהירה וכהה' : 'Switch between light and dark themes'}</p>
                        </div>
                        <Toggle
                            checked={isDark}
                            onChange={toggleTheme}
                        />
                    </div>
                    <div className="theme-preview">
                        <div className={`preview-card ${isDark ? 'dark' : 'light'}`}>
                            <div className="preview-header"></div>
                            <div className="preview-content">
                                <div className="preview-line"></div>
                                <div className="preview-line short"></div>
                            </div>
                        </div>
                        <span className="preview-label">{isDark ? (isRTL ? 'מצב כהה' : 'Dark Mode') : (isRTL ? 'מצב בהיר' : 'Light Mode')}</span>
                    </div>
                </Card>
            </section>

            {/* Notifications Section */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '200ms' }}>
                <h2 className="section-title">🔔 {isRTL ? 'התראות' : 'Notifications'}</h2>
                <Card variant="elevated" padding="lg">
                    <div className="notification-info-box">
                        <div className="notification-icon">✉️</div>
                        <div className="notification-content">
                            <h3>{isRTL ? 'התראות אימייל' : 'Email Notifications'}</h3>
                            <p className="notification-description">
                                {isRTL
                                    ? 'כדי לקבל עדכונים על ניתוח החוזים שלך, אשר את האימייל מ-Amazon SES שנשלח אליך בהרשמה.'
                                    : 'To receive updates about your contract analysis, verify the email from Amazon SES sent during registration.'
                                }
                            </p>
                            <div className="notification-tip">
                                <span className="tip-icon">💡</span>
                                <span className="tip-text">
                                    {isRTL
                                        ? 'בדוק גם בתיקיית הספאם אם לא קיבלת את המייל'
                                        : 'Check your spam folder if you haven\'t received the email'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* About Section */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '300ms' }}>
                <h2 className="section-title">ℹ️ {isRTL ? 'אודות' : 'About'}</h2>
                <Card variant="elevated" padding="lg">
                    <div className="about-info">
                        <div className="about-row">
                            <span>{isRTL ? 'גרסה' : 'Version'}</span>
                            <span className="about-value">1.0.0</span>
                        </div>
                        <div className="about-row">
                            <span>{isRTL ? 'נבנה על ידי' : 'Built by'}</span>
                            <span className="about-value">Ron, Moty & Dan</span>
                        </div>
                        <div className="about-row">
                            <span>{isRTL ? 'פרויקט' : 'Project'}</span>
                            <span className="about-value">{isRTL ? 'פרויקט גמר מחשוב ענן' : 'Cloud Computing Final Project'}</span>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Danger Zone */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '400ms' }}>
                <h2 className="section-title danger">⚠️ {isRTL ? 'חשבון' : 'Account'}</h2>
                <Card variant="elevated" padding="lg" className="danger-card">
                    <div className="setting-row">
                        <div className="setting-info">
                            <h3>{t('nav.logout')}</h3>
                            <p>{isRTL ? 'התנתקות מהחשבון שלך' : 'Sign out of your account'}</p>
                        </div>
                        <Button variant="danger" onClick={handleLogout}>
                            {t('nav.logout')}
                        </Button>
                    </div>

                    {/* DAN DID IT - Added Delete Account section */}
                    <div className="setting-row" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <div className="setting-info">
                            <h3>{t('account.deleteAccount')}</h3>
                            <p>{t('account.deleteAccountDescription')}</p>
                        </div>
                        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                            {t('account.deleteAccount')}
                        </Button>
                    </div>
                </Card>
            </section>

            {/* Delete Account Confirmation Modal - rendered via Portal for full screen overlay */}
            {showDeleteModal && ReactDOM.createPortal(
                <div className="modal-backdrop" onClick={() => !isDeleting && setShowDeleteModal(false)}>
                    <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
                        <button
                            className="modal-close"
                            onClick={() => setShowDeleteModal(false)}
                            disabled={isDeleting}
                        >
                            ✕
                        </button>

                        <div className="modal-icon danger-icon">⚠️</div>

                        <h2>{t('account.deleteConfirmTitle')}</h2>

                        <div className="delete-warning">
                            <p><strong>{t('account.deleteConfirmMessage')}</strong></p>
                            <p>{t('account.deleteConfirmItem1')}</p>
                            <p>{t('account.deleteConfirmItem2')}</p>
                            <p>{t('account.deleteConfirmItem3')}</p>
                            <p className="warning-text"><strong>{t('account.deleteConfirmWarning')}</strong></p>
                        </div>

                        <div className="delete-confirm-input">
                            <label>{t('account.typeDeleteToConfirm')}</label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                disabled={isDeleting}
                                style={{ textAlign: isRTL ? 'right' : 'left' }}
                            />
                        </div>

                        {deleteError && (
                            <p className="error-message">{deleteError}</p>
                        )}

                        <div className="modal-actions">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                                loading={isDeleting}
                            >
                                {isDeleting ? t('account.deletingAccount') : t('account.deleteAccount')}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SettingsPage;
