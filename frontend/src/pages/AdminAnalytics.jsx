/**
 * ============================================
 *  AdminAnalytics
 *  Contract Analysis Statistics for Admins
 * ============================================
 * 
 * STRUCTURE:
 * - Risk distribution pie chart
 * - Average risk score gauge
 * - Common problematic clauses bar chart
 * 
 * FEATURES:
 * - Visual risk breakdown by category
 * - Animated gauge showing average score
 * - Top issues table with codes and topics
 * - Responsive charts for mobile/tablet
 * 
 * DEPENDENCIES:
 * - api.js: getSystemStats
 * - MUI X Charts: PieChart, BarChart, Gauge
 * - ThemeContext: isDark for chart theming
 * 
 * ============================================
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getSystemStats } from '../services/api';
import Button from '../components/Button';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { useAnimate, useAnimateBar, useDrawingArea } from '@mui/x-charts/hooks';
import { interpolateObject } from '@mui/x-charts-vendor/d3-interpolate';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    BarChart3,
    AlertTriangle,
    FileText,
    RefreshCw
} from 'lucide-react';
import './AdminDashboard.css';

const AdminAnalytics = () => {
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(500);

    // Responsive breakpoint for chart sizing
    const isMobile = useMediaQuery('(max-width:480px)');

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
                setChartWidth(Math.max(300, containerWidth - 40));
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
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

    const valueTextColor = isDark ? '#f8fafc' : '#1a1a2e';
    const labelColor = isDark ? '#94a3b8' : '#475569';

    // Risk distribution data
    const riskDistribution = stats?.riskDistribution || {
        lowRisk: 0,
        lowMediumRisk: 0,
        mediumRisk: 0,
        highRisk: 0
    };
    const pieData = [
        { id: 0, value: riskDistribution.lowRisk, label: t('score.lowRisk') || 'Low Risk', color: '#22c55e' },
        { id: 1, value: riskDistribution.lowMediumRisk, label: t('score.lowMediumRisk') || 'Low-Medium', color: '#14b8a6' },
        { id: 2, value: riskDistribution.mediumRisk, label: t('score.mediumRisk') || 'Medium Risk', color: '#f59e0b' },
        { id: 3, value: riskDistribution.highRisk, label: t('score.highRisk') || 'High Risk', color: '#ef4444' },
    ];

    // Common issues data with distinct colors
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];
    const rawCommonIssues = stats?.commonIssues || [];
    const commonIssues = rawCommonIssues.map((issue, index) => ({
        ...issue,
        color: colors[index % colors.length]
    }));

    // Risk score
    const rawScore = stats?.analysis?.avgRiskScore || 60;
    const avgRiskScore = typeof rawScore === 'number' ? rawScore : parseInt(rawScore, 10);
    const riskColor = avgRiskScore >= 86 ? '#22c55e' :
        avgRiskScore >= 71 ? '#14b8a6' :
            avgRiskScore >= 51 ? '#f59e0b' : '#ef4444';

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>
                    <BarChart3 size={28} style={{ marginInlineEnd: '12px' }} />
                    {t('admin.analytics') || 'Analytics'}
                </h1>
                <p>{t('admin.analyticsDescription') || 'Detailed contract analysis and risk insights'}</p>
            </header>

            <div className="admin-content">
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

                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : (
                    <ThemeProvider theme={chartTheme}>
                        <div className="stats-dashboard">
                            {/* Charts Grid - 2 equal cards */}
                            <div className="analytics-cards-row">
                                {/* Risk Distribution Pie Chart */}
                                <div className="analytics-card">
                                    <h3>
                                        <AlertTriangle size={16} />
                                        {t('admin.riskDistribution') || 'התפלגות סיכונים'}
                                    </h3>
                                    <div className="chart-content">
                                        <div className="pie-chart-wrapper">
                                            <PieChart
                                                series={[{
                                                    data: pieData,
                                                    innerRadius: isMobile ? 35 : 50,
                                                    outerRadius: isMobile ? 65 : 90,
                                                    paddingAngle: 2,
                                                    cornerRadius: 4,
                                                    highlightScope: { faded: 'global', highlighted: 'item' },
                                                }]}
                                                width={isMobile ? 160 : 220}
                                                height={isMobile ? 150 : 200}
                                                margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                slotProps={{
                                                    legend: { hidden: true }
                                                }}
                                            />
                                        </div>
                                        <div className="pie-legend">
                                            {pieData.map((item) => (
                                                <div key={item.id} className="legend-item">
                                                    <span className="dot" style={{ backgroundColor: item.color }}></span>
                                                    <span className="legend-label">{item.label}</span>
                                                    <span className="legend-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Average Risk Score Gauge */}
                                <div className="analytics-card">
                                    <h3>
                                        <AlertTriangle size={16} />
                                        {t('admin.avgRiskScore') || 'ציון סיכון ממוצע'}
                                    </h3>
                                    <div className="chart-content gauge-content">
                                        <Gauge
                                            value={avgRiskScore}
                                            valueMin={0}
                                            valueMax={100}
                                            width={isMobile ? 160 : 200}
                                            height={isMobile ? 140 : 180}
                                            margin={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                            sx={{
                                                [`& .${gaugeClasses.valueText}`]: {
                                                    fontSize: isMobile ? 28 : 36,
                                                    fontWeight: 'bold',
                                                    fill: valueTextColor,
                                                },
                                                [`& .${gaugeClasses.valueArc}`]: {
                                                    fill: riskColor,
                                                },
                                                [`& .${gaugeClasses.referenceArc}`]: {
                                                    fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                },
                                            }}
                                            text={({ value }) => `${Math.round(value)}/100`}
                                        />
                                        <p className="gauge-label" style={{ color: riskColor }}>
                                            <span className="risk-dot" style={{ backgroundColor: riskColor }}></span>
                                            {avgRiskScore >= 86 ? t('score.lowRisk') :
                                                avgRiskScore >= 71 ? t('score.lowMediumRisk') :
                                                    avgRiskScore >= 51 ? t('score.mediumRisk') :
                                                        t('score.highRisk')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Common Problematic Clauses - Full Width */}
                            <div className="analytics-card analytics-card-full" ref={chartContainerRef}>
                                <h3>
                                    <FileText size={16} />
                                    {t('admin.commonIssues') || 'בעיות נפוצות בחוזים'}
                                </h3>
                                {commonIssues.length > 0 ? (
                                    <div className="bar-chart-section">
                                        {/* Chart with short labels */}
                                        <div className="bar-chart-wrapper" dir="ltr">
                                            <BarChart
                                                layout="horizontal"
                                                dataset={commonIssues}
                                                yAxis={[{
                                                    scaleType: 'band',
                                                    dataKey: 'code',
                                                    colorMap: {
                                                        type: 'ordinal',
                                                        colors: commonIssues.map(i => i.color)
                                                    },
                                                    tickLabelStyle: {
                                                        fill: isDark ? '#ffffff' : labelColor,
                                                        fontSize: 12,
                                                        fontWeight: 600
                                                    },
                                                }]}
                                                xAxis={[{
                                                    tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                                }]}
                                                series={[{
                                                    dataKey: 'count',
                                                    valueFormatter: (value) => `${value}`,
                                                }]}
                                                width={isMobile ? Math.min(chartWidth, 320) : Math.min(chartWidth, 600)}
                                                height={isMobile ? 180 : 250}
                                                margin={{ left: 40, right: 15, top: 10, bottom: 25 }}
                                                slots={{
                                                    bar: BarShadedBackground,
                                                    barLabel: BarLabelAtBase
                                                }}
                                                barLabel={(v) => v.value}
                                            />
                                        </div>
                                        {/* Legend Table for Hebrew text */}
                                        <div className="bar-chart-legend">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>{t('admin.code') || 'קוד'}</th>
                                                        <th>{t('admin.issue') || 'בעיה'}</th>
                                                        <th>{t('admin.count') || 'כמות'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {commonIssues.map((issue) => (
                                                        <tr key={issue.code}>
                                                            <td className="code-cell">
                                                                <span className="code-badge" style={{ backgroundColor: issue.color }}>
                                                                    {issue.code}
                                                                </span>
                                                            </td>
                                                            <td className="issue-cell">{issue.topic}</td>
                                                            <td className="count-cell">{issue.count}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="no-data" style={{ padding: '40px 20px', textAlign: 'center' }}>
                                        {t('admin.noIssuesYet') || 'עדיין לא נמצאו בעיות - העלה חוזים לניתוח'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </ThemeProvider>
                )}
            </div>
        </div>
    );
};

export default AdminAnalytics;

// --- Helper Components for Shiny Chart ---

function BarShadedBackground(props) {
    const { ownerState, ...other } = props;
    const { isDark } = useTheme();

    const animatedProps = useAnimateBar(props);
    const { width: drawingWidth } = useDrawingArea();

    return (
        <React.Fragment>
            <rect
                {...other}
                fill={isDark ? '#f8fafc' : '#1a1a2e'}
                opacity={isDark ? 0.05 : 0.05}
                x={other.x}
                width={drawingWidth}
                style={{ rx: 4 }}
            />
            <rect
                {...other}
                filter={ownerState.isHighlighted ? 'brightness(120%)' : undefined}
                opacity={ownerState.isFaded ? 0.3 : 1}
                style={{ rx: 4 }}
                {...animatedProps}
            />
        </React.Fragment>
    );
}

const Text = styled('text')(({ theme }) => ({
    ...theme?.typography?.body2,
    fill: '#ffffff',
    transition: 'opacity 0.2s ease-in, fill 0.2s ease-in',
    textAnchor: 'start',
    dominantBaseline: 'central',
    pointerEvents: 'none',
    fontWeight: 600,
    fontSize: '0.75rem',
    textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
}));

function BarLabelAtBase(props) {
    const {
        xOrigin,
        y,
        height,
        skipAnimation,
        ...otherProps
    } = props;

    // Position label slightly inside the bar
    const animatedProps = useAnimate(
        { x: xOrigin + 8, y: y + height / 2 },
        {
            initialProps: { x: xOrigin, y: y + height / 2 },
            createInterpolator: interpolateObject,
            transformProps: (p) => p,
            applyProps: (element, p) => {
                element.setAttribute('x', p.x.toString());
                element.setAttribute('y', p.y.toString());
            },
            skip: skipAnimation,
        },
    );

    return <Text {...otherProps} {...animatedProps} />;
}
