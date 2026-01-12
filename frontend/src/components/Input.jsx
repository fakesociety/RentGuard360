/**
 * ============================================
 *  Input
 *  iOS-Style Input Field Component
 * ============================================
 * 
 * PROPS:
 * - type: string (text, email, password, etc.)
 * - label: string
 * - value: string
 * - onChange: function
 * - error: string (error message)
 * - helperText: string
 * - leftIcon/rightIcon: React.ReactNode
 * - disabled: boolean
 * - required: boolean
 * 
 * ============================================
 */
import React from 'react';
import './Input.css';

const Input = ({
    type = 'text',
    label,
    placeholder,
    value,
    onChange,
    error,
    helperText,
    leftIcon,
    rightIcon,
    disabled = false,
    required = false,
    className = '',
    ...props
}) => {
    const inputClasses = [
        'input',
        error && 'input-error',
        leftIcon && 'input-with-left-icon',
        rightIcon && 'input-with-right-icon',
        disabled && 'input-disabled'
    ].filter(Boolean).join(' ');

    return (
        <div className={`input-wrapper ${className}`}>
            {label && (
                <label className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}

            <div className="input-container">
                {leftIcon && (
                    <span className="input-icon input-icon-left">{leftIcon}</span>
                )}

                <input
                    type={type}
                    className={inputClasses}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    required={required}
                    {...props}
                />

                {rightIcon && (
                    <span className="input-icon input-icon-right">{rightIcon}</span>
                )}
            </div>

            {(error || helperText) && (
                <p className={error ? 'input-error-text' : 'input-helper-text'}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
