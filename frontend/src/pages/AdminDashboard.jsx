/**
 * ============================================
 *  AdminDashboard
 *  System Statistics & Analytics for Admins
 * ============================================
 * 
 * STRUCTURE:
 * - Summary cards (contracts, users, avg time)
 * - Line chart: Contracts analyzed over time
 * - Line chart: User registrations over time
 * 
 * FEATURES:
 * - Date range filtering (7d, 30d, month, year, all)
 * - Responsive chart sizing
 * - Dark/light theme support for MUI charts
 * - Admin-only access (isAdmin check)
 * 
 * DEPENDENCIES:
 * - api.js: getSystemStats
 * - MUI X Charts: LineChart, BarChart
 * - ThemeContext: isDark for chart theming
 * 
 * ============================================
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getSystemStats } from '../services/api';
import Button from '../components/Button';
import { LineChart } from '@mui/x-charts/LineChart';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
    FileText,
    CheckCircle,
    Users,
    Clock,
    TrendingUp,
    UserPlus,
    AlertTriangle,
    Lock,
    RefreshCw
} from 'lucide-react';
import './AdminDashboard.css';



const AdminDashboard = () => {
    const { isAdmin, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('30d');
    const [userDateRange, setUserDateRange] = useState('30d');
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(450);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSystemStats();
            setStats(data);
        } catch (err) {
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Responsive chart width
    useEffect(() => {
        const updateWidth = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.offsetWidth;
                // Use container width minus padding (20px each side = 40px total)
                const availableWidth = containerWidth - 40;
                // Minimum 280, use full available width
                setChartWidth(Math.max(280, availableWidth));
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        // Also update after a short delay to catch layout shifts
        const timer = setTimeout(updateWidth, 100);
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer);
        };
    }, [loading]);

    // Create MUI theme for charts
    const chartTheme = useMemo(() => createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',
            text: {
                primary: isDark ? '#f8fafc' : '#1a1a2e',
                secondary: isDark ? '#94a3b8' : 'rgba(0,0,0,0.6)',
            },
            background: {
                default: isDark ? '#0f0f23' : '#f8fafc',
                paper: isDark ? '#1a1a2e' : '#ffffff',
            },
        },
    }), [isDark]);

    const labelColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    const accessDenied = !isAdmin;

    // Unified Date Range Calculation
    const calculateDateRange = (range) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (range) {
            case '7d':
                return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: today };
            case '30d':
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
            case 'month':
                return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
            case 'year':
                return { start: new Date(now.getFullYear(), 0, 1), end: today };
            case 'all':
                return { start: new Date(2020, 0, 1), end: today };
            default:
                if (range && range.match(/^\d{4}$/)) {
                    const year = parseInt(range);
                    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
                }
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
        }
    };

    const { start: rangeStart, end: rangeEnd } = calculateDateRange(dateRange);

    // Safe local date parser to avoid UTC offsets hiding today's data
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return new Date();
        // Accept both YYYY-MM-DD and full ISO timestamps (YYYY-MM-DDTHH:mm:ss...)
        const dateOnly = String(dateStr).slice(0, 10);
        const parts = dateOnly.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    // Filter contracts by day
    const contractsByDay = (stats?.contractsByDay || []).filter(d => {
        const date = parseLocalDate(d.date);
        return date >= rangeStart && date <= rangeEnd;
    });

    // Transform for LineChart with time scale (matching userChartDataset approach)
    const contractsChartDataset = useMemo(() => {
        return contractsByDay.map(d => ({
            date: parseLocalDate(d.date),
            analyzed: d.analyzed,
        }));
    }, [contractsByDay]);





    // User registrations with date range filtering
    const { start: userRangeStart, end: userRangeEnd } = calculateDateRange(userDateRange);

    const filteredUserRegs = (stats?.userRegistrations || []).filter(d => {
        const date = parseLocalDate(d.date);
        return date >= userRangeStart && date <= userRangeEnd;
    });

    const userChartDataset = filteredUserRegs.map(d => ({
        date: parseLocalDate(d.date),
        count: Number(d.count) || 0
    }));





    const formatTime = (seconds) => {
        if (!seconds) return '—';
        if (seconds < 60) return `${Math.round(seconds)} ${t('admin.seconds')}`;
        return `${Math.round(seconds / 60)} ${t('admin.minutes')}`;
    };

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>{t('admin.title')}</h1>
                <p>{isRTL ? 'שלום' : 'Hello'}, {userAttributes?.name || 'Admin'}</p>
            </header>

            <div className="admin-content">
                {accessDenied && (
                    <div className="access-denied">
                        <Lock size={48} />
                        <h1>{t('admin.accessDenied')}</h1>
                        <p>{t('admin.noPermission')}</p>
                    </div>
                )}

                {error && (
                    <div className="error-banner">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                        <Button variant="secondary" size="small" onClick={fetchStats}>
                            <RefreshCw size={14} />
                            {t('admin.tryAgain')}
                        </Button>
                    </div>
                )}

                {!accessDenied && loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : !accessDenied && stats && (
                    <ThemeProvider theme={chartTheme}>
                        <div className="stats-dashboard">
                            {/* Summary Cards */}
                            <div className="summary-cards">
                                <div className="summary-card contracts">
                                    <div className="card-icon">
                                        <FileText size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{stats.contracts?.total || 0}</span>
                                        <span className="card-label">{t('admin.totalContracts')}</span>
                                    </div>
                                </div>
                                <div className="summary-card analyzed">
                                    <div className="card-icon">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{stats.contracts?.analyzed || 0}</span>
                                        <span className="card-label">{t('admin.analyzed')}</span>
                                    </div>
                                </div>
                                <div className="summary-card users">
                                    <div className="card-icon">
                                        <Users size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{stats.users?.total || 0}</span>
                                        <span className="card-label">{t('admin.totalUsers')}</span>
                                    </div>
                                </div>
                                <div className="summary-card time">
                                    <div className="card-icon">
                                        <Clock size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{formatTime(stats.analysis?.avgAnalysisTimeSeconds)}</span>
                                        <span className="card-label">{t('admin.avgAnalysisTime')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Grid - Two Charts Side by Side */}
                            {/* Charts Grid - Two Charts Side by Side */}
                            <div className="dashboard-charts-row">
                                {/* Contracts Over Time */}
                                <div className="dashboard-chart-card" ref={chartContainerRef}>
                                    <div className="chart-header">
                                        <h3>
                                            <TrendingUp size={16} />
                                            {t('admin.analyzedOverTime') || 'חוזים שנותחו לאורך הזמן'}
                                        </h3>
                                        <div className="date-range-selector">
                                            <div className="date-range-buttons">
                                                {['7d', '30d', 'month', 'year', 'all'].map(range => (
                                                    <button
                                                        key={range}
                                                        className={`range-btn ${dateRange === range ? 'active' : ''}`}
                                                        onClick={() => setDateRange(range)}
                                                    >
                                                        {range === '7d' ? `7 ${t('admin.days')}` :
                                                            range === '30d' ? `30 ${t('admin.days')}` :
                                                                range === 'month' ? t('admin.thisMonth') :
                                                                    range === 'year' ? t('admin.thisYear') :
                                                                        t('admin.allTime') || 'הכל'}
                                                    </button>
                                                ))}
                                                <select
                                                    className="year-picker"
                                                    value={dateRange.match(/^\d{4}$/) ? dateRange : ''}
                                                    onChange={(e) => e.target.value && setDateRange(e.target.value)}
                                                >
                                                    <option value="" disabled>{t('admin.selectYear') || 'Year'}</option>
                                                    {[2026, 2025].map(year => (
                                                        <option key={year} value={String(year)}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-container line-chart-container" dir="ltr">
                                        {contractsChartDataset.length > 0 ? (
                                            <LineChart
                                                key={`contracts-${dateRange}-${contractsChartDataset.length}-${chartWidth}`}
                                                dataset={contractsChartDataset}
                                                xAxis={[{
                                                    dataKey: 'date',
                                                    scaleType: 'time',
                                                    valueFormatter: (date) => date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' }),
                                                    tickLabelStyle: { fill: labelColor, fontSize: 10, angle: -45, textAnchor: 'end' },
                                                }]}
                                                yAxis={[{
                                                    tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                                    tickMinStep: 1,
                                                    min: 0,
                                                }]}
                                                series={[{
                                                    dataKey: 'analyzed',
                                                    area: true,
                                                    color: '#10B981',
                                                    showMark: false,
                                                }]}
                                                width={chartWidth}
                                                height={220}
                                                sx={{
                                                    '& .MuiAreaElement-root': { fillOpacity: 0.3 },
                                                    '& .MuiChartsAxis-tickLabel': { fill: labelColor },
                                                    '& .MuiChartsAxis-line': { stroke: labelColor },
                                                    '& .MuiChartsGrid-line': { stroke: gridColor },
                                                }}
                                                grid={{ vertical: true, horizontal: true }}
                                            />
                                        ) : (
                                            <div className="no-data">{t('admin.noData')}</div>
                                        )}
                                    </div>
                                </div>

                                {/* User Registrations Over Time */}
                                <div className="dashboard-chart-card">
                                    <div className="chart-header">
                                        <h3>
                                            <UserPlus size={16} />
                                            {t('admin.userRegistrations') || 'משתמשים שנרשמו לאורך הזמן'}
                                        </h3>
                                        <div className="date-range-selector">
                                            <div className="date-range-buttons">
                                                {['7d', '30d', 'month', 'year', 'all'].map(range => (
                                                    <button
                                                        key={range}
                                                        className={`range-btn ${userDateRange === range ? 'active' : ''}`}
                                                        onClick={() => setUserDateRange(range)}
                                                    >
                                                        {range === '7d' ? `7 ${t('admin.days')}` :
                                                            range === '30d' ? `30 ${t('admin.days')}` :
                                                                range === 'month' ? t('admin.thisMonth') :
                                                                    range === 'year' ? t('admin.thisYear') :
                                                                        t('admin.allTime') || 'הכל'}
                                                    </button>
                                                ))}
                                                <select
                                                    className="year-picker"
                                                    value={userDateRange.match(/^\d{4}$/) ? userDateRange : ''}
                                                    onChange={(e) => e.target.value && setUserDateRange(e.target.value)}
                                                >
                                                    <option value="" disabled>{t('admin.selectYear') || 'Year'}</option>
                                                    {[2026, 2025].map(year => (
                                                        <option key={year} value={String(year)}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-container line-chart-container" dir="ltr">
                                        {userChartDataset.length > 0 ? (
                                            <LineChart
                                                key={`users-${userDateRange}-${userChartDataset.length}-${chartWidth}`}
                                                dataset={userChartDataset}
                                                xAxis={[{
                                                    dataKey: 'date',
                                                    scaleType: 'time',
                                                    valueFormatter: (date) => date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' }),
                                                    tickLabelStyle: { fill: labelColor, fontSize: 10, angle: -45, textAnchor: 'end' },
                                                }]}
                                                yAxis={[{
                                                    tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                                    tickMinStep: 1,
                                                    min: 0,
                                                }]}
                                                series={[{
                                                    dataKey: 'count',
                                                    area: true,
                                                    showMark: false,
                                                    color: '#3B82F6',
                                                }]}
                                                grid={{ vertical: true, horizontal: true }}
                                                width={chartWidth}
                                                height={220}
                                                sx={{
                                                    '& .MuiAreaElement-root': { fillOpacity: 0.25 },
                                                    '& .MuiChartsAxis-tickLabel': { fill: labelColor },
                                                    '& .MuiChartsAxis-line': { stroke: labelColor },
                                                    '& .MuiChartsGrid-line': { stroke: gridColor },
                                                }}
                                            />
                                        ) : (
                                            <div className="no-data">{t('admin.noData')}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="stats-footer">
                                {t('admin.updatedAt')}: {stats.generatedAt ? new Date(stats.generatedAt).toLocaleString(isRTL ? 'he-IL' : 'en-US') : '—'}
                            </p>
                        </div>
                    </ThemeProvider>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
