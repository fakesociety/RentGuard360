/**
 * ============================================
 *  Card
 *  iOS 26 Glassmorphic Card Component
 * ============================================
 * 
 * PROPS:
 * - variant: 'elevated' | 'outlined' | 'glass'
 * - padding: 'sm' | 'md' | 'lg'
 * - hoverable: boolean
 * - onClick: function (makes card clickable)
 * 
 * ============================================
 */
import React from 'react';
import './Card.css';

const Card = ({
    variant = 'elevated',
    padding = 'md',
    hoverable = false,
    onClick,
    className = '',
    children,
    ...props
}) => {
    const classes = [
        'card',
        `card-${variant}`,
        `card-padding-${padding}`,
        hoverable && 'card-hoverable',
        onClick && 'card-clickable',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
