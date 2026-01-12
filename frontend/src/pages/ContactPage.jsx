/**
 * ============================================
 *  ContactPage
 *  Customer Support Contact Form
 * ============================================
 * 
 * STRUCTURE:
 * - Contact form (name, email, subject, message)
 * - Quick help sidebar with FAQ
 * - Response time information
 * 
 * FEATURES:
 * - Pre-fills user name/email from auth
 * - Sends message via API (creates support ticket)
 * - Success confirmation state
 * 
 * DEPENDENCIES:
 * - api.js: sendContactMessage
 * - Card, Input, Button components
 * 
 * ============================================
 */
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { sendContactMessage } from '../services/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import './ContactPage.css';

const ContactPage = () => {
    const { userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const [formData, setFormData] = useState({
        name: userAttributes?.name || '',
        email: userAttributes?.email || '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSubmitStatus(null);

        try {
            const response = await sendContactMessage({
                ...formData,
                email: userAttributes?.email || formData.email,
            });

            if (response.ticketId || response.message === 'Ticket created') {
                setSubmitStatus('success');
                setFormData({ ...formData, subject: '', message: '' });
            } else {
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('Contact form error:', err);
            setError(err.message || (isRTL ? 'שליחת ההודעה נכשלה. נסו שוב.' : 'Failed to send message. Please try again.'));
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="contact-header animate-fadeIn">
                <h1>📧 {t('nav.contact')}</h1>
                <p>{isRTL ? 'יש לכם שאלה או צריכים עזרה? אנחנו כאן בשבילכם!' : 'Have a question or need help? We\'re here for you!'}</p>
            </div>

            <div className="contact-content">
                <Card variant="elevated" padding="lg" className="contact-form-card animate-slideUp">
                    {submitStatus === 'success' ? (
                        <div className="success-message">
                            <span className="success-icon">✅</span>
                            <h3>{isRTL ? 'ההודעה נשלחה!' : 'Message Sent!'}</h3>
                            <p>{isRTL ? 'נחזור אליכם תוך 24 שעות.' : 'We\'ll get back to you within 24 hours.'}</p>
                            <Button
                                variant="secondary"
                                onClick={() => setSubmitStatus(null)}
                            >
                                {isRTL ? 'שליחת הודעה נוספת' : 'Send Another Message'}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <h3>{isRTL ? 'שלחו לנו הודעה' : 'Send Us a Message'}</h3>

                            <div className="form-row">
                                <Input
                                    label={isRTL ? 'שם' : 'Name'}
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder={isRTL ? 'ישראל ישראלי' : 'John Smith'}
                                />
                                <Input
                                    label={isRTL ? 'אימייל' : 'Email'}
                                    name="email"
                                    type="email"
                                    value={userAttributes?.email || formData.email}
                                    onChange={handleChange}
                                    disabled
                                    required
                                    placeholder="example@email.com"
                                />
                            </div>

                            <Input
                                label={isRTL ? 'נושא' : 'Subject'}
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                placeholder={isRTL ? 'במה נוכל לעזור?' : 'How can we help?'}
                            />

                            <div className="textarea-wrapper">
                                <label className="input-label">{isRTL ? 'הודעה' : 'Message'}</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    placeholder={isRTL ? 'תארו את הבעיה או השאלה שלכם בפירוט...' : 'Describe your issue or question in detail...'}
                                    rows={5}
                                    className="contact-textarea"
                                />
                            </div>

                            {error && <p className="form-error">{error}</p>}

                            <Button
                                variant="primary"
                                fullWidth
                                loading={isSubmitting}
                                type="submit"
                            >
                                {isSubmitting ? (isRTL ? 'שולח...' : 'Sending...') : (isRTL ? 'שליחת הודעה' : 'Send Message')}
                            </Button>
                        </form>
                    )}
                </Card>

                <div className="contact-info animate-slideUp" style={{ animationDelay: '100ms' }}>
                    <Card variant="glass" padding="md">
                        <h4>📍 {isRTL ? 'עזרה מהירה' : 'Quick Help'}</h4>
                        <ul className="help-list">
                            <li>
                                <strong>{isRTL ? 'הניתוח מראה "מעבד..."?' : 'Analysis shows "Processing"?'}</strong>
                                <span>{isRTL ? 'הניתוח נמשך עד 2 דקות. הדף מתעדכן אוטומטית - אין צורך לרענן.' : 'Analysis takes up to 2 minutes. The page auto-updates - no need to refresh.'}</span>
                            </li>
                            <li>
                                <strong>{isRTL ? 'דרישות הקובץ?' : 'File requirements?'}</strong>
                                <span>{isRTL ? 'PDF בלבד, בין 30KB ל-5MB. שם קובץ עד 100 תווים.' : 'PDF only, between 30KB and 5MB. Filename up to 100 characters.'}</span>
                            </li>
                            <li>
                                <strong>{isRTL ? 'איך לייצא את הניתוח?' : 'How to export analysis?'}</strong>
                                <span>{isRTL ? 'בדף הניתוח, לחצו על "ייצוא" לקבלת דוח Word או PDF.' : 'On the analysis page, click "Export" to get a Word or PDF report.'}</span>
                            </li>
                            <li>
                                <strong>{isRTL ? 'מה משמעות הציון?' : 'What does the score mean?'}</strong>
                                <span>{isRTL ? '100 = מושלם. נקודות מנוכות לפי חומרת הסעיפים הבעייתיים.' : '100 = perfect. Points are deducted based on issue severity.'}</span>
                            </li>
                        </ul>
                    </Card>

                    <Card variant="glass" padding="md">
                        <h4>⏰ {isRTL ? 'זמן תגובה' : 'Response Time'}</h4>
                        <p className="response-info">
                            {isRTL
                                ? <>אנחנו בדרך כלל עונים תוך <strong>24 שעות</strong> בימי עבודה. לבעיות דחופות, הוסיפו "דחוף" בנושא ההודעה.</>
                                : <>We usually respond within <strong>24 hours</strong> on business days. For urgent issues, add "Urgent" to the subject line.</>
                            }
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
