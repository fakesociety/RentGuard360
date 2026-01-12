/**
 * ============================================
 *  ContractsPage
 *  User's Contract List & Management
 * ============================================
 * 
 * STRUCTURE:
 * - ContractCard: Individual contract display component
 * - ContractsPage: Main page with list, modals, pagination
 * - Contract list with risk score gauges
 * - Auto-refresh for pending analysis
 * - Edit/Delete contract modals
 * - Export to Word/PDF
 * - Sort by date or score
 * - Pagination (20 per page)
 * - Timeout detection (default 3 min)
 * 
 * DEPENDENCIES:
 * - api.js: getContracts, deleteContract, getAnalysis, updateContract
 * - ExportService.js: exportToWord, exportToPDF
 * - RiskGauge: Visual score display
 * 
 * ============================================
 */
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getContracts, deleteContract, getAnalysis, updateContract } from '../services/api';
import { exportToWord, exportToPDF } from '../services/ExportService';
import Button from '../components/Button';
import RiskGauge from '../components/RiskGauge';
import { Trash2, Pencil, Download, Plus, RefreshCw, FileText, X, Check, ChevronDown, ArrowUpDown, Calendar, AlertTriangle } from 'lucide-react';
import './ContractsPage.css';

// Timeout constant (ms) for when a pending analysis is treated as "timed out".
// Configurable via VITE_ANALYSIS_TIMEOUT_MS; defaults to 3 minutes.
const DEFAULT_ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;
const ANALYSIS_TIMEOUT_MS = (() => {
    const raw = import.meta.env.VITE_ANALYSIS_TIMEOUT_MS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANALYSIS_TIMEOUT_MS;
})();

// Check if a contract has timed out (pending for longer than ANALYSIS_TIMEOUT_MS)
const isContractTimedOut = (contract) => {
    const status = (contract.status || '').toLowerCase();
    if (status === 'analyzed' || status === 'failed' || status === 'error') {
        return false; // Already has final status
    }

    const uploadDate = contract.uploadDate;
    if (!uploadDate) return false;

    const uploadTime = new Date(uploadDate.endsWith('Z') ? uploadDate : uploadDate + 'Z').getTime();
    const now = Date.now();
    const elapsed = now - uploadTime;

    return elapsed > ANALYSIS_TIMEOUT_MS;
};

// Contract Card Component
const ContractCard = ({ contract, onDelete, onEdit, onExport, formatDate, t, isRTL }) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const status = (contract.status || '').toLowerCase();

    // Score thresholds match legend: lower score = higher risk
    const getScoreColor = (score) => {
        if (score >= 86) return 'excellent';  // 86-100: Low Risk (green)
        if (score >= 71) return 'good';       // 71-85: Low-Medium Risk (light green)
        if (score >= 51) return 'medium';     // 51-70: Medium Risk (orange)
        return 'low';                         // 0-50: High Risk (red)
    };

    const getScoreLabel = (score) => {
        if (score >= 86) return t('contracts.lowRisk');
        if (score >= 71) return t('contracts.lowMediumRisk');
        if (score >= 51) return t('contracts.mediumRisk');
        return t('contracts.highRisk');
    };

    // Check for timeout - treat as failed if pending too long
    const isTimedOut = isContractTimedOut(contract);

    const isAnalyzed = status === 'analyzed';
    const isFailed = status === 'failed' || status === 'error' || isTimedOut;
    const score = contract.riskScore ?? contract.risk_score ?? null;
    const hasScore = isAnalyzed && score !== null && score !== undefined;

    return (
        <div className="contract-card">
            {/* Card Header */}
            <div className="card-header">
                <div className="card-header-info">
                    <div className="card-icon">
                        <FileText size={20} />
                    </div>
                    <div className="card-header-content">
                        <h3 className="card-title">{contract.fileName || (isRTL ? 'חוזה ללא שם' : 'Untitled Contract')}</h3>
                        <span className="card-date">{formatDate(contract.uploadDate)}</span>
                    </div>
                </div>
                {/* Score Gauge */}
                {hasScore ? (
                    <RiskGauge score={score} size={80} />
                ) : isFailed ? (
                    <div className="score-gauge error">
                        <X size={24} strokeWidth={3} />
                    </div>
                ) : (
                    <div className="score-gauge pending">
                        <RefreshCw size={20} className="spinning" />
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="card-body">
                {/* Status */}
                <div className="status-row">
                    {isAnalyzed ? (
                        <span className={`status-chip ${getScoreColor(score)}`}>
                            {getScoreLabel(score)}
                        </span>
                    ) : isFailed ? (
                        <span className="status-chip error">
                            {isTimedOut
                                ? (isRTL ? 'תם הזמן - נסה שוב' : 'Timed Out - Retry')
                                : (isRTL ? 'שגיאה בניתוח' : 'Analysis Failed')}
                        </span>
                    ) : (
                        <span className="status-chip pending">{t('contracts.pendingAnalysis')}...</span>
                    )}
                    {contract.analyzedDate && (
                        <span className="analyzed-date">{isRTL ? 'נותח:' : 'Analyzed:'} {formatDate(contract.analyzedDate)}</span>
                    )}
                </div>

                {/* Meta Info */}
                <div className="card-meta">
                    <p className="meta-item">
                        <span className="meta-label">{t('contracts.propertyAddress')}:</span> {contract.propertyAddress || t('contracts.notSpecified')}
                    </p>
                    <p className="meta-item">
                        <span className="meta-label">{t('contracts.landlordName')}:</span> {contract.landlordName || t('contracts.notSpecified')}
                    </p>
                </div>
            </div>

            {/* Card Footer - Actions */}
            <div className="card-footer">
                {isAnalyzed ? (
                    <Link
                        to={`/analysis/${encodeURIComponent(contract.contractId)}`}
                        state={{ contract }}
                        className="view-btn"
                    >
                        {t('contracts.viewAnalysis')}
                    </Link>
                ) : (
                    <span className="view-btn disabled">
                        {isFailed ? (isRTL ? 'ניתוח נכשל' : 'Analysis Failed') : (isRTL ? 'ממתין...' : 'Pending...')}
                    </span>
                )}
                <div className="action-buttons">
                    {/* Export Dropdown */}
                    <div className="dropdown-container">
                        <button
                            className="icon-btn"
                            onClick={(e) => { e.preventDefault(); setShowExportMenu(!showExportMenu); }}
                            title="ייצוא"
                        >
                            <Download size={16} />
                        </button>
                        {showExportMenu && (
                            <div className="dropdown-menu">
                                <button onClick={() => { onExport(contract, 'pdf'); setShowExportMenu(false); }}>
                                    PDF
                                </button>
                                <button onClick={() => { onExport(contract, 'word'); setShowExportMenu(false); }}>
                                    Word
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="icon-btn" onClick={(e) => onEdit(contract, e)} title="עריכה">
                        <Pencil size={16} />
                    </button>
                    <button className="icon-btn danger" onClick={(e) => onDelete(contract.contractId, e)} title="מחיקה">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Contracts Page
const ContractsPage = () => {
    const { user, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editModal, setEditModal] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Filter/Sort state
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'score'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const contractsPerPage = 20;

    const fetchContracts = useCallback(async (showLoader = true) => {
        const userId = user?.userId || user?.username || userAttributes?.sub;
        if (!userId) {
            setIsLoading(false);
            return;
        }

        try {
            if (showLoader) setIsLoading(true);
            else setIsRefreshing(true);

            // Start timing for minimum display
            const startTime = Date.now();
            const data = await getContracts(userId);

            // Ensure toast shows for at least 1.5 seconds
            const elapsed = Date.now() - startTime;
            if (!showLoader && elapsed < 1500) {
                await new Promise(resolve => setTimeout(resolve, 1500 - elapsed));
            }

            setContracts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch contracts:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user, userAttributes]);

    useEffect(() => { fetchContracts(); }, [fetchContracts]);

    // Auto-refresh while there are pending contracts (not failed/analyzed/timed out)
    useEffect(() => {
        console.log('[AutoPoll] useEffect triggered - contracts count:', contracts.length);

        const pendingContracts = contracts.filter(c => {
            const status = (c.status || '').toLowerCase();
            // Skip if already has final status
            if (status === 'analyzed' || status === 'failed' || status === 'error') {
                return false;
            }
            // Skip if timed out
            if (isContractTimedOut(c)) {
                return false;
            }
            // Check if actually pending/processing
            return status === 'processing' ||
                status === 'uploaded' ||
                status === 'pending' ||
                !status;  // No status yet
        });

        console.log('[AutoPoll] Contract statuses:', contracts.map(c => ({
            id: c.contractId?.substring(0, 8),
            status: (c.status || '').toLowerCase() || null,
            timedOut: isContractTimedOut(c)
        })));
        console.log('[AutoPoll] Pending contracts:', pendingContracts.length);

        if (pendingContracts.length === 0) {
            console.log('[AutoPoll] No pending contracts - NOT starting interval');
            return;
        }

        console.log('[AutoPoll] Starting 30 second interval...');
        const interval = setInterval(() => {
            console.log('[AutoPoll] Interval fired - fetching contracts at', new Date().toISOString());
            fetchContracts(false);
        }, 30000);

        return () => {
            console.log('[AutoPoll] Cleanup - clearing interval');
            clearInterval(interval);
        };
    }, [contracts, fetchContracts]);

    const handleDelete = (contractId, e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setDeleteConfirm(contractId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        const userId = user?.userId || user?.username || userAttributes?.sub;
        setIsDeleting(true);
        try {
            await deleteContract(deleteConfirm, userId);
            setContracts(contracts.filter(c => c.contractId !== deleteConfirm));
            setDeleteConfirm(null);
        } catch {
            alert('מחיקה נכשלה');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (contract, e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setEditModal({
            contractId: contract.contractId,
            fileName: (contract.fileName || '').replace(/\.pdf$/i, ''),
            propertyAddress: contract.propertyAddress || '',
            landlordName: contract.landlordName || ''
        });
    };

    const saveEdit = async () => {
        if (!editModal) return;
        const userId = user?.userId || user?.username || userAttributes?.sub;
        setIsSaving(true);
        try {
            const updates = {
                fileName: editModal.fileName.trim() || 'Contract',
                propertyAddress: editModal.propertyAddress.trim(),
                landlordName: editModal.landlordName.trim()
            };
            await updateContract(editModal.contractId, userId, updates);
            const finalFileName = updates.fileName.endsWith('.pdf') ? updates.fileName : `${updates.fileName}.pdf`;
            setContracts(contracts.map(c =>
                c.contractId === editModal.contractId
                    ? { ...c, fileName: finalFileName, propertyAddress: updates.propertyAddress, landlordName: updates.landlordName }
                    : c
            ));
            setEditModal(null);
        } catch {
            alert('שמירה נכשלה');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async (contract, type) => {
        try {
            const analysis = await getAnalysis(contract.contractId);
            if (type === 'pdf') await exportToPDF(analysis, contract.fileName || 'Report');
            else await exportToWord(analysis, contract.fileName || 'Report');
        } catch {
            alert('ייצוא נכשל');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const utcDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
        return new Date(utcDate).toLocaleDateString('he-IL');
    };

    // Sort contracts based on current filter
    const sortedContracts = [...contracts].sort((a, b) => {
        if (sortBy === 'date') {
            const dateA = new Date(a.uploadDate || 0);
            const dateB = new Date(b.uploadDate || 0);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        } else if (sortBy === 'score') {
            const scoreA = a.riskScore ?? a.risk_score ?? 0;
            const scoreB = b.riskScore ?? b.risk_score ?? 0;
            return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        }
        return 0;
    });

    const handleSortChange = (newSortBy) => {
        if (sortBy === newSortBy) {
            // Toggle order if same field
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('desc');
        }
        setCurrentPage(1); // Reset to first page on sort change
    };

    // Pagination logic
    const totalPages = Math.ceil(sortedContracts.length / contractsPerPage);
    const startIndex = (currentPage - 1) * contractsPerPage;
    const paginatedContracts = sortedContracts.slice(startIndex, startIndex + contractsPerPage);

    if (isLoading) {
        return (
            <div className="contracts-page page-container" dir="rtl">
                <div className="loading-container">
                    <RefreshCw size={32} className="spinning" />
                    <p>{t('contracts.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contracts-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Refresh Toast */}
            {isRefreshing && (
                <div className="refresh-toast">
                    <RefreshCw size={18} className="spinning" />
                    <span>{isRTL ? 'מרענן...' : 'Refreshing...'}</span>
                </div>
            )}

            {/* Delete Confirmation Modal - rendered via Portal for full screen overlay */}
            {deleteConfirm && ReactDOM.createPortal(
                <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>{t('contracts.deleteTitle')}</h3>
                        <p>{t('contracts.deleteConfirm')}</p>
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>{t('contracts.cancel')}</button>
                            <button className="btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                                {isDeleting ? t('contracts.deleting') : t('contracts.delete')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Modal - rendered via Portal for full screen overlay */}
            {editModal && ReactDOM.createPortal(
                <div className="modal-backdrop" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>{t('contracts.editTitle')}</h3>
                        <div className="form-group">
                            <label>{t('contracts.fileName')}</label>
                            <input
                                type="text"
                                value={editModal.fileName}
                                onChange={e => setEditModal({ ...editModal, fileName: e.target.value })}
                                placeholder="שם הקובץ"
                            />
                        </div>
                        <div className="form-group">
                            <label>כתובת הנכס</label>
                            <input
                                type="text"
                                value={editModal.propertyAddress}
                                onChange={e => setEditModal({ ...editModal, propertyAddress: e.target.value })}
                                placeholder="כתובת"
                            />
                        </div>
                        <div className="form-group">
                            <label>שם המשכיר</label>
                            <input
                                type="text"
                                value={editModal.landlordName}
                                onChange={e => setEditModal({ ...editModal, landlordName: e.target.value })}
                                placeholder="משכיר"
                            />
                        </div>
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setEditModal(null)}>ביטול</button>
                            <button className="btn-primary" onClick={saveEdit} disabled={isSaving}>
                                {isSaving ? 'שומר...' : 'שמירה'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Page Header */}
            <header className="page-header">
                <div className="header-content">
                    <h1>{t('contracts.title')}</h1>
                    <p>{t('contracts.subtitle')}</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-ghost"
                        onClick={() => fetchContracts(false)}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
                        {t('contracts.refresh')}
                    </button>
                    <Link to="/upload" className="btn-primary">
                        <Plus size={18} />
                        {t('contracts.uploadContract')}
                    </Link>
                </div>
            </header>

            {/* Filter Bar */}
            {contracts.length > 0 && (
                <div className="filter-bar">
                    <span className="filter-label">{t('contracts.sortBy')}</span>
                    <button
                        className={`filter-btn ${sortBy === 'date' ? 'active' : ''}`}
                        onClick={() => handleSortChange('date')}
                    >
                        <Calendar size={16} />
                        <span>{t('contracts.sortDate')}</span>
                        {sortBy === 'date' && (
                            <span className="sort-arrow">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                        )}
                    </button>
                    <button
                        className={`filter-btn ${sortBy === 'score' ? 'active' : ''}`}
                        onClick={() => handleSortChange('score')}
                    >
                        <AlertTriangle size={16} />
                        <span>{t('contracts.sortScore')}</span>
                        {sortBy === 'score' && (
                            <span className="sort-arrow">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                        )}
                    </button>
                </div>
            )}

            {/* Content */}
            {contracts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <FileText size={48} />
                    </div>
                    <h2>{t('contracts.noContracts')}</h2>
                    <p>{t('contracts.noContractsDesc')}</p>
                    <Link to="/upload" className="btn-primary large">
                        <Plus size={20} />
                        {t('contracts.uploadFirst')}
                    </Link>
                </div>
            ) : (
                <div className="contracts-grid">
                    {paginatedContracts.map(contract => (
                        <ContractCard
                            key={contract.contractId}
                            contract={contract}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onExport={handleExport}
                            formatDate={formatDate}
                            t={t}
                            isRTL={isRTL}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        {isRTL ? '→' : '←'}
                    </button>
                    <span className="pagination-info">
                        {isRTL ? `עמוד ${currentPage} מתוך ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        {isRTL ? '←' : '→'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContractsPage;
