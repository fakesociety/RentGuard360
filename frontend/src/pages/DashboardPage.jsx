/**
 * ============================================
 *  DashboardPage
 *  User Dashboard & Overview
 * ============================================
 * 
 * STRUCTURE:
 * - Welcome banner with dynamic greeting
 * - Stats cards (total, analyzed, pending, high risk)
 * - Quick actions (upload, view contracts)
 * - Getting started guide
 * - Why Us features section
 * - Responsive grid layout
 * 
 * DEPENDENCIES:
 * - api.js: getContracts (for stats)
 * - Card, Button components
 * 
 * ============================================
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getContracts } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import { Shield, Zap, BarChart3, Lightbulb, Cloud } from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
    const { userAttributes, user } = useAuth();
    const { t, isRTL } = useLanguage();
    const [stats, setStats] = useState({
        total: 0,
        analyzed: 0,
        pending: 0,
        highRisk: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const userId = user?.userId || user?.username;
            if (!userId) {
                setIsLoading(false);
                return;
            }

            const contracts = await getContracts(userId);
            const contractsList = Array.isArray(contracts) ? contracts : [];

            // Count analyzed contracts with riskScore
            const analyzedContracts = contractsList.filter(c => c.status === 'analyzed');

            // High risk = score <= 50 (lower score means higher risk)
            const highRiskContracts = analyzedContracts.filter(c => {
                const score = c.riskScore ?? c.risk_score ?? 100;
                return score <= 50;
            });

            setStats({
                total: contractsList.length,
                analyzed: analyzedContracts.length,
                pending: contractsList.filter(c => c.status !== 'analyzed' && c.status !== 'failed' && c.status !== 'error').length,
                highRisk: highRiskContracts.length,
            });
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const getUserName = () => {
        if (userAttributes?.name) return userAttributes.name;
        if (userAttributes?.email) return userAttributes.email.split('@')[0];
        return t('common.user');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        // Night: 21:00-4:59, Morning: 5:00-11:59, Afternoon: 12:00-16:59, Evening: 17:00-20:59
        if (hour >= 21 || hour < 5) return t('dashboard.greeting.night');
        if (hour < 12) return t('dashboard.greeting.morning');
        if (hour < 17) return t('dashboard.greeting.afternoon');
        return t('dashboard.greeting.evening');
    };

    const statCards = [
        { label: t('dashboard.totalContracts'), value: stats.total, icon: 'contracts', color: '#3b82f6' },
        { label: t('dashboard.analyzed'), value: stats.analyzed, icon: 'check', color: '#10b981' },
        { label: t('dashboard.pending'), value: stats.pending, icon: 'clock', color: '#f59e0b' },
        { label: t('dashboard.highRisk'), value: stats.highRisk, icon: 'alert', color: '#ef4444' },
    ];

    const getIcon = (iconName) => {
        switch (iconName) {
            case 'contracts':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                );
            case 'check':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20,6 9,17 4,12" />
                    </svg>
                );
            case 'clock':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                    </svg>
                );
            case 'alert':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="dashboard-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* GRAY BAND: Welcome + Stats */}
            <div className="section-band">
                <section className="welcome-section">
                    <h1 className="welcome-title animate-fadeIn">
                        {getGreeting()}, {getUserName()}
                    </h1>
                    <p className="welcome-subtitle animate-fadeIn">
                        {isRTL ? 'ברוכים הבאים ל-RentGuard 360. העלו ונתחו חוזי שכירות עם בינה מלאכותית.' : 'Welcome to RentGuard 360. Upload and analyze rental contracts with AI.'}
                    </p>
                </section>

                <section className="stats-section">
                    <div className="stats-grid">
                        {statCards.map((stat, index) => (
                            <Card
                                key={stat.label}
                                variant="glass"
                                padding="md"
                                className="stat-card animate-slideUp"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                                    {getIcon(stat.icon)}
                                </div>
                                <div className="stat-content">
                                    <p className="stat-value">{isLoading ? '-' : stat.value}</p>
                                    <p className="stat-label">{stat.label}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            </div>

            {/* WHITE BAND: Quick Actions */}
            <div className="section-band-alt">
                <section className="actions-section">
                    <h2 className="section-title">{isRTL ? 'פעולות מהירות' : 'Quick Actions'}</h2>
                    <div className="actions-grid">
                        <Card variant="elevated" padding="lg" className="action-card action-card-inset animate-slideUp" style={{ animationDelay: '400ms' }}>
                            <div className="action-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17,8 12,3 7,8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <h3>{t('dashboard.uploadContract')}</h3>
                            <p>{t('dashboard.uploadDescription')}</p>
                            <Link to="/upload">
                                <Button variant="primary" fullWidth>{t('dashboard.uploadPDF')}</Button>
                            </Link>
                        </Card>

                        <Card variant="elevated" padding="lg" className="action-card action-card-inset animate-slideUp" style={{ animationDelay: '500ms' }}>
                            <div className="action-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                            </div>
                            <h3>{t('dashboard.viewContracts')}</h3>
                            <p>{t('dashboard.viewDescription')}</p>
                            <Link to="/contracts">
                                <Button variant="secondary" fullWidth>{t('dashboard.viewAll')}</Button>
                            </Link>
                        </Card>
                    </div>
                </section>
            </div>

            {/* GRAY BAND: How to Start Guide */}
            <div className="section-band">
                <section className="guide-section animate-fadeIn" style={{ animationDelay: '600ms' }}>
                    <Card variant="glass" padding="lg" className="guide-card">
                        <h2>{t('dashboard.howToStart')}</h2>
                        <div className="guide-steps">
                            <div className="guide-step">
                                <div className="guide-number">1</div>
                                <div className="guide-content">
                                    <h4>{t('dashboard.step1Title')}</h4>
                                    <p>{t('dashboard.step1Desc')}</p>
                                </div>
                            </div>
                            <span className="step-arrow">{isRTL ? '←' : '→'}</span>
                            <div className="guide-step">
                                <div className="guide-number">2</div>
                                <div className="guide-content">
                                    <h4>{t('dashboard.step2Title')}</h4>
                                    <p>{t('dashboard.step2Desc')}</p>
                                </div>
                            </div>
                            <span className="step-arrow">{isRTL ? '←' : '→'}</span>
                            <div className="guide-step">
                                <div className="guide-number">3</div>
                                <div className="guide-content">
                                    <h4>{t('dashboard.step3Title')}</h4>
                                    <p>{t('dashboard.step3Desc')}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>
            </div>

            {/* WHITE BAND: Why We're Different */}
            <div className="section-band-alt">
                <section className="differentiators-section animate-fadeIn" style={{ animationDelay: '800ms' }}>
                    <div className="differentiators-container">
                        <div className="differentiators-image">
                            <img src="/lawyer-hero.jpg" alt="Your Legal Consultant" />
                        </div>
                        <div className="differentiators-content">
                            <h2>{t('dashboard.whyUs')}</h2>
                            <p className="differentiators-subtitle">{t('dashboard.whyUsSubtitle')}</p>

                            <div className="feature-list">
                                <div className="feature-item">
                                    <div className="feature-icon privacy">
                                        <Shield size={22} />
                                    </div>
                                    <div className="feature-text">
                                        <h4>{t('dashboard.featurePrivacy')}</h4>
                                        <p>{t('dashboard.featurePrivacyDesc')}</p>
                                    </div>
                                </div>

                                <div className="feature-item">
                                    <div className="feature-icon prompt">
                                        <Zap size={22} />
                                    </div>
                                    <div className="feature-text">
                                        <h4>{t('dashboard.featurePrompt')}</h4>
                                        <p>{t('dashboard.featurePromptDesc')}</p>
                                    </div>
                                </div>

                                <div className="feature-item">
                                    <div className="feature-icon score">
                                        <BarChart3 size={22} />
                                    </div>
                                    <div className="feature-text">
                                        <h4>{t('dashboard.featureScore')}</h4>
                                        <p>{t('dashboard.featureScoreDesc')}</p>
                                    </div>
                                </div>

                                <div className="feature-item">
                                    <div className="feature-icon tips">
                                        <Lightbulb size={22} />
                                    </div>
                                    <div className="feature-text">
                                        <h4>{t('dashboard.featureTips')}</h4>
                                        <p>{t('dashboard.featureTipsDesc')}</p>
                                    </div>
                                </div>

                                <div className="feature-item">
                                    <div className="feature-icon aws">
                                        <Cloud size={22} />
                                    </div>
                                    <div className="feature-text">
                                        <h4>{t('dashboard.featureAws')}</h4>
                                        <p>{t('dashboard.featureAwsDesc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DashboardPage;
