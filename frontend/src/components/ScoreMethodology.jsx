/**
 * ============================================
 *  ScoreMethodology
 *  Expandable Score Explanation Panel
 * ============================================
 * 
 * STRUCTURE:
 * - Toggle button "How is the score calculated?"
 * - Expandable content:
 *   - Main explanation
 *   - Severity legend (High/Medium/Low)
 *   - 5 categories grid with icons
 *   - Legal source reference
 * 
 * FEATURES:
 * - Bilingual (Hebrew/English)
 * - Collapsible accordion design
 * 
 * ============================================
 */
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Info, ChevronDown } from 'lucide-react';
import './ScoreMethodology.css';

const ScoreMethodology = () => {
    const { isRTL } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);

    const categories = [
        {
            key: 'financial_terms',
            icon: '💰',
            labelHe: 'תנאים פיננסיים',
            labelEn: 'Financial Terms',
            descHe: 'ערבות, קנסות איחור, ביטוח',
            descEn: 'Deposits, late fees, insurance'
        },
        {
            key: 'tenant_rights',
            icon: '🏠',
            labelHe: 'זכויות השוכר',
            labelEn: 'Tenant Rights',
            descHe: 'כניסה לדירה, סאבלט, פרטיות',
            descEn: 'Entry notice, subletting, privacy'
        },
        {
            key: 'termination_clauses',
            icon: '📋',
            labelHe: 'סיום חוזה',
            labelEn: 'Termination',
            descHe: 'תקופת הודעה, יציאה מוקדמת',
            descEn: 'Notice period, early exit'
        },
        {
            key: 'liability_repairs',
            icon: '🔧',
            labelHe: 'אחריות ותיקונים',
            labelEn: 'Liability & Repairs',
            descHe: 'תיקונים, בלאי סביר',
            descEn: 'Repairs, normal wear'
        },
        {
            key: 'legal_compliance',
            icon: '⚖️',
            labelHe: 'תאימות חוקית',
            labelEn: 'Legal Compliance',
            descHe: 'התאמה לחוק השכירות 2017',
            descEn: '2017 Rental Law compliance'
        }
    ];

    return (
        <div className="score-methodology">
            <button
                className="methodology-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <div className="toggle-content">
                    <Info size={16} />
                    <span>{isRTL ? 'איך מחושב הציון?' : 'How is the score calculated?'}</span>
                </div>
                <ChevronDown size={16} className="methodology-chevron" />
            </button>

            {isExpanded && (
                <div className="methodology-content">
                    {/* Main Explanation */}
                    <div className="methodology-intro">
                        <p>
                            {isRTL
                                ? 'הציון הוא 5 קטגוריות × 20 נק׳ (סה״כ 100). מורידים נקודות לפי חומרה.'
                                : 'Score = 5 categories × 20 points (total 100). Points are deducted by severity.'}
                        </p>
                        <p>
                            {isRTL
                                ? 'תקרה: קטגוריה לא יורדת מתחת ל-0 ⇒ מקסימום 20 נק׳ ירידה לכל קטגוריה (לכן סכום הקנסות יכול להיות גבוה יותר מהירידה בפועל בציון).'
                                : 'Cap: a category cannot drop below 0 ⇒ max 20-point impact per category (so total penalties may exceed the actual score drop).'}
                        </p>
                    </div>

                    {/* Severity Legend */}
                    <div className="severity-legend">
                        <div className="severity-item high">
                            <span className="severity-dot"></span>
                            <span className="severity-label">{isRTL ? 'גבוה' : 'High'}</span>
                            <span className="severity-points">8-10 {isRTL ? 'נקודות' : 'pts'}</span>
                        </div>
                        <div className="severity-item medium">
                            <span className="severity-dot"></span>
                            <span className="severity-label">{isRTL ? 'בינוני' : 'Medium'}</span>
                            <span className="severity-points">4-6 {isRTL ? 'נקודות' : 'pts'}</span>
                        </div>
                        <div className="severity-item low">
                            <span className="severity-dot"></span>
                            <span className="severity-label">{isRTL ? 'נמוך' : 'Low'}</span>
                            <span className="severity-points">2-3 {isRTL ? 'נקודות' : 'pts'}</span>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="categories-header">
                        <h4>{isRTL ? '5 קטגוריות × 20 נקודות = 100' : '5 Categories × 20 points = 100'}</h4>
                    </div>

                    <div className="categories-grid">
                        {categories.map((cat) => (
                            <div key={cat.key} className="category-item">
                                <span className="category-icon">{cat.icon}</span>
                                <div className="category-info">
                                    <span className="category-label">
                                        {isRTL ? cat.labelHe : cat.labelEn}
                                    </span>
                                    <span className="category-desc">
                                        {isRTL ? cat.descHe : cat.descEn}
                                    </span>
                                </div>
                                <span className="category-points">20</span>
                            </div>
                        ))}
                    </div>

                    {/* Legal Source */}
                    <div className="legal-source">
                        <span className="source-icon">📜</span>
                        <span className="source-text">
                            {isRTL
                                ? 'מבוסס על חוק השכירות והשאילה (תיקון 2017) - סעיפים 25א-25טו'
                                : 'Based on Israeli Rental Law (2017 Amendment) - Sections 25a-25o'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScoreMethodology;
