/**
 * ============================================
 *  LanguageToggle
 *  Hebrew/English Language Switcher
 * ============================================
 * 
 * FEATURES:
 * - Two-option toggle (עב | EN)
 * - Uses LanguageContext for state
 * - Visual indicator for active language
 * 
 * ============================================
 */
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageToggle.css';

const LanguageToggle = () => {
    const { language, toggleLanguage } = useLanguage();

    return (
        <button
            className="language-toggle"
            onClick={toggleLanguage}
            title={language === 'he' ? 'Switch to English' : 'עבור לעברית'}
        >
            <span className={`lang-option ${language === 'he' ? 'active' : ''}`}>עב</span>
            <span className="lang-separator">|</span>
            <span className={`lang-option ${language === 'en' ? 'active' : ''}`}>EN</span>
        </button>
    );
};

export default LanguageToggle;
