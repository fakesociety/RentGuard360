/**
 * ============================================
 *  Footer
 *  Application Footer with Features & Credits
 * ============================================
 * 
 * STRUCTURE:
 * - Brand column (logo, tagline)
 * - Features column (AWS, encryption, AI, privacy)
 * - Credits column (contact, project info)
 * 
 * FEATURES:
 * - Responsive 3-column layout
 * - Theme-aware styling
 * - Bilingual content (Hebrew/English)
 * 
 * ============================================
 */
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, Cloud, Lock, Cpu, Mail, Clock } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    const { isRTL } = useLanguage();
    const { theme } = useTheme();

    return (
        <footer className={`app-footer ${theme}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="footer-container">
                {/* Main Row - 3 Columns */}
                <div className="footer-row">
                    {/* Column 1: Logo & Brand */}
                    <div className="footer-col col-brand">
                        <div className="footer-logo">
                            <Shield size={18} className="footer-shield" />
                            <span className="footer-name">RentGuard 360</span>
                        </div>
                        <p className="footer-tagline">
                            {isRTL ? 'ההגנה שלך בחוזה השכירות' : 'Your Rental Contract Guardian'}
                        </p>
                    </div>

                    {/* Column 2: Features */}
                    <div className="footer-col col-features">
                        <div className="features-row">
                            <div className="footer-feature">
                                <Cloud size={14} />
                                <span>{isRTL ? 'אחסון מאובטח' : 'Secure Storage'}</span>
                            </div>
                            <div className="footer-feature">
                                <Lock size={14} />
                                <span>{isRTL ? 'ללא מידע אישי' : 'No Personal Data'}</span>
                            </div>
                            <div className="footer-feature">
                                <Cpu size={14} />
                                <span>{isRTL ? 'AI מתקדם' : 'Advanced AI'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Contact & Credits */}
                    <div className="footer-col col-contact">
                        <div className="contact-inner">
                            <div className="contact-row">
                                <Mail size={14} />
                                <a href="mailto:rentguard360@gmail.com">rentguard360@gmail.com</a>
                            </div>
                            <div className="contact-row">
                                <Clock size={14} />
                                <span>{isRTL ? 'תגובה עד 24 שעות' : 'Response within 24h'}</span>
                            </div>
                            <div className="credits-row">
                                {isRTL ? 'נבנה ע"י' : 'Built by'}{' '}
                                {isRTL ? (
                                    <>
                                        <a href="https://github.com/Dangutman98" target="_blank" rel="noopener noreferrer">Dan</a>
                                        {' & '}
                                        <a href="https://github.com/fakesociety" target="_blank" rel="noopener noreferrer">Moty</a>
                                        {', '}
                                        <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron</a>
                                    </>
                                ) : (
                                    <>
                                        <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron</a>
                                        {', '}
                                        <a href="https://github.com/fakesociety" target="_blank" rel="noopener noreferrer">Moty</a>
                                        {' & '}
                                        <a href="https://github.com/Dangutman98" target="_blank" rel="noopener noreferrer">Dan</a>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Copyright Row */}
                <div className="footer-copyright">
                    © 2025 RentGuard 360 | AI-Lawyers Team
                </div>
            </div>
        </footer>
    );
};

export default Footer;
