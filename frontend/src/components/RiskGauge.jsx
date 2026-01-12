/**
 * ============================================
 *  RiskGauge
 *  Premium Risk Score Visualization
 * ============================================
 * 
 * STRUCTURE:
 * - Semi-circular gradient arc
 * - Animated indicator dot
 * - Score number display
 * 
 * FEATURES:
 * - Smooth gradient (green → yellow → red)
 * - Animated progress from 0 to score
 * - Glow effect matching risk level
 * 
 * PROPS:
 * - score: number (0-100)
 * - size: number in pixels (default: 80)
 * - animate: boolean (default: true)
 * 
 * ============================================
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import './RiskGauge.css';

const RiskGauge = ({ score = 0, size = 80, animate = true }) => {
    const clampScore = (value) => {
        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(100, n));
    };

    const targetScore = clampScore(score);
    const [animatedScore, setAnimatedScore] = useState(0);
    const displayScore = animate ? animatedScore : targetScore;

    const rafIdRef = useRef(null);
    const isMountedRef = useRef(false);
    const gradientId = useId();
    const glowId = useId();

    // Animate score on mount
    useEffect(() => {
        if (!animate) {
            setAnimatedScore(targetScore);
            return;
        }

        // Cancel any in-flight animation (prevents overlapping RAF loops on rapid route changes)
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        const duration = 800; // ms
        const startTime = performance.now();
        const startScore = isMountedRef.current ? clampScore(animatedScore) : 0;

        const animateScore = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentScore = startScore + (targetScore - startScore) * eased;

            setAnimatedScore(currentScore);

            if (progress < 1) {
                rafIdRef.current = requestAnimationFrame(animateScore);
            }
        };

        rafIdRef.current = requestAnimationFrame(animateScore);
        isMountedRef.current = true;

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetScore, animate]);

    // Calculate arc parameters
    const strokeWidth = 8;
    const radius = 40;
    const circumference = Math.PI * radius; // Half circle
    const progressOffset = circumference - (displayScore / 100) * circumference;

    // Determine risk level for glow color
    // Higher score = LOWER risk (green), Lower score = HIGHER risk (red)
    const getRiskLevel = (s) => {
        if (s >= 86) return 'excellent';  // 86-100: Low Risk (green)
        if (s >= 71) return 'good';       // 71-85: Low-Medium Risk (teal)
        if (s >= 51) return 'medium';     // 51-70: Medium Risk (orange)
        return 'high';                    // 0-50: High Risk (red)
    };

    const riskLevel = getRiskLevel(displayScore);

    // Glow colors matching the 4 risk levels
    const glowColors = {
        excellent: 'rgba(52, 199, 89, 0.5)',   // Green
        good: 'rgba(20, 184, 166, 0.5)',       // Teal
        medium: 'rgba(245, 158, 11, 0.5)',    // Orange
        high: 'rgba(239, 68, 68, 0.5)'        // Red
    };

    const scoreText = Math.round(displayScore);

    return (
        <div
            className={`risk-gauge risk-${riskLevel}`}
            style={{
                width: size,
                height: size * 0.7,
                '--glow-color': glowColors[riskLevel]
            }}
        >
            <svg
                viewBox="0 0 100 60"
                className="gauge-arc-svg"
            >
                {/* Gradient definition - Red (low score/high risk) → Yellow → Green (high score/low risk) */}
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background arc (gray track) */}
                <path
                    d="M 10 55 A 40 40 0 0 1 90 55"
                    fill="none"
                    stroke="rgba(100, 116, 139, 0.3)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="gauge-track"
                />

                {/* Gradient arc (full) */}
                <path
                    d="M 10 55 A 40 40 0 0 1 90 55"
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="gauge-gradient-bg"
                    style={{ opacity: 0.25 }}
                />

                {/* Progress arc with gradient */}
                <path
                    d="M 10 55 A 40 40 0 0 1 90 55"
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    className="gauge-progress"
                    filter={`url(#${glowId})`}
                    style={{
                        transition: animate ? 'none' : 'stroke-dashoffset 0.5s ease-out'
                    }}
                />

                {/* Indicator dot at the end of progress */}
                <circle
                    cx={50 + 40 * Math.cos(Math.PI - (displayScore / 100) * Math.PI)}
                    cy={55 - 40 * Math.sin((displayScore / 100) * Math.PI)}
                    r="5"
                    className="gauge-indicator"
                    filter={`url(#${glowId})`}
                />
            </svg>

            {/* Score number */}
            <div className="gauge-score">
                {scoreText}
            </div>
        </div>
    );
};

export default RiskGauge;
