/**
 * ============================================
 *  GlobalErrorBoundary
 *  Application-Wide Error Handler
 * ============================================
 * 
 * STRUCTURE:
 * - Error UI with logo and message
 * - Reload button
 * - Dev-only error details
 * 
 * FEATURES:
 * - Catches uncaught React errors
 * - Displays friendly error screen
 * - Shows stack trace in development
 * - Bilingual error message
 * 
 * ============================================
 */
import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import Button from './Button';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    width: '100%',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-primary)',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '40px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: 'var(--shadow-lg)',
                        maxWidth: '500px',
                        width: '100%'
                    }}>
                        <Shield size={64} color="var(--primary)" style={{ marginBottom: '20px' }} />
                        <h1 style={{ marginBottom: '10px' }}>Something went wrong</h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                            משהו השתבש. אנא נסו לרענן את העמוד.
                            <br />
                            (Something went wrong. Please try refreshing the page.)
                        </p>

                        <Button variant="primary" onClick={this.handleReload} fullWidth>
                            <RefreshCw size={18} style={{ marginRight: '8px' }} />
                            Reload Page / רענון
                        </Button>

                        {import.meta.env.DEV && this.state.error && (
                            <details style={{ marginTop: '20px', textAlign: 'left', background: '#000', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '200px' }}>
                                <summary style={{ color: 'red', cursor: 'pointer' }}>Error Details</summary>
                                <pre style={{ fontSize: '12px', color: '#ff5555' }}>
                                    {this.state.error.toString()}
                                    <br />
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
