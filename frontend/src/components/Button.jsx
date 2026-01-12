/**
 * ============================================
 *  Button
 *  iOS 26 Liquid-Style Button Component
 * ============================================
 * 
 * PROPS:
 * - variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 * - size: 'sm' | 'md' | 'lg'
 * - fullWidth: boolean
 * - loading: boolean (shows spinner)
 * - disabled: boolean
 * - leftIcon/rightIcon: React.ReactNode
 * - onClick: function
 * 
 * ============================================
 */
import React from 'react';
import './Button.css';

const Button = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    leftIcon = null,
    rightIcon = null,
    onClick,
    children,
    className = '',
    ...props
}) => {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full',
        loading && 'btn-loading',
        disabled && 'btn-disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            onClick={onClick}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="btn-spinner" />
            )}
            {!loading && leftIcon && (
                <span className="btn-icon btn-icon-left">{leftIcon}</span>
            )}
            <span className="btn-text">{children}</span>
            {!loading && rightIcon && (
                <span className="btn-icon btn-icon-right">{rightIcon}</span>
            )}
        </button>
    );
};

export default Button;
