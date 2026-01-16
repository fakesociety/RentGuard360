/**
 * ============================================
 *  UploadPage
 *  Contract Upload Flow
 * ============================================
 * 
 * STRUCTURE:
 * - Drop zone for drag-and-drop PDF upload
 * - File validation (size, type, name length)
 * - Metadata form (property, landlord, custom name)
 * - Progress bar during upload
 * - Terms acceptance modal
 * - Success toast + auto-redirect to analysis
 * 
 * DEPENDENCIES:
 * - api.js: uploadFile
 * - Card, Button, Input components
 * 
 * ============================================
 */
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { pollForAnalysis, uploadFile } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import './UploadPage.css';

const UploadPage = () => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadedContractId, setUploadedContractId] = useState('');
    const fileInputRef = useRef(null);

    const [metadata, setMetadata] = useState({
        propertyAddress: '',
        landlordName: '',
        startDate: '',
        monthlyRent: '',
    });
    const [customFileName, setCustomFileName] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const emitGlobalToast = (title, message) => {
        const toast = {
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            title,
            message,
            createdAt: Date.now(),
            ttlMs: 5500,
        };

        try {
            sessionStorage.setItem('rg_toast', JSON.stringify(toast));
        } catch {
            // ignore
        }

        try {
            window.dispatchEvent(new CustomEvent('rg:toast', { detail: toast }));
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!uploadSuccess || !uploadedContractId) return;

        let cancelled = false;
        (async () => {
            try {
                // Give Step Functions some time to start writing analysis
                const result = await pollForAnalysis(uploadedContractId, 24, 5000);
                if (cancelled) return;
                if (result) {
                    // Pass contract data in navigation state for immediate display
                    navigate(`/analysis/${encodeURIComponent(uploadedContractId)}`, {
                        state: {
                            contract: {
                                ...result,
                                contractId: uploadedContractId,
                                fileName: customFileName || result?.fileName,
                                propertyAddress: metadata.propertyAddress || result?.propertyAddress,
                                landlordName: metadata.landlordName || result?.landlordName,
                                uploadDate: result?.uploadDate || new Date().toISOString(),
                            }
                        }
                    });
                }
            } catch (e) {
                // If polling fails/times out, keep the user on this page (they can go to contracts manually)
                if (!cancelled) {
                    console.warn('Auto-navigate polling failed:', e);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [uploadSuccess, uploadedContractId, navigate]);

    const validateFile = (file) => {
        const maxSize = 5 * 1024 * 1024; // 5MB - standard for rental contracts
        const minSize = 30 * 1024; // 30KB - minimum for a valid PDF with content
        const maxFileNameLength = 100; // Max filename length
        if (!file.type.includes('pdf')) {
            return t('upload.pdfOnly');
        }
        if (file.size > maxSize) {
            return t('upload.fileTooLarge');
        }
        if (file.size < minSize) {
            return t('upload.fileTooSmall');
        }
        if (file.name.length > maxFileNameLength) {
            return t('upload.fileNameTooLong');
        }
        return null;
    };

    const handleFileSelect = (selectedFile) => {
        setError('');
        setUploadSuccess(false);
        const validationError = validateFile(selectedFile);
        if (validationError) {
            setError(validationError);
            return;
        }
        setFile(selectedFile);
        const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '');
        setCustomFileName(nameWithoutExt);
    };

    const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDragOver = (e) => { e.preventDefault(); };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
    };

    const handleInputChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) handleFileSelect(selectedFile);
    };

    const handleUpload = async () => {
        if (!file || !termsAccepted) return;

        setIsUploading(true);
        setUploadProgress(0);
        setError('');

        try {
            const result = await uploadFile(file, setUploadProgress, {
                propertyAddress: metadata.propertyAddress,
                landlordName: metadata.landlordName,
                customFileName: customFileName.trim() || file.name.replace(/\.pdf$/i, ''),
                termsAccepted: true,
            });

            setUploadedContractId(result.contractId || '');
            setUploadSuccess(true);
            emitGlobalToast(t('upload.uploadSuccessTitle'), t('upload.uploadSuccessMessage'));
            setFile(null);
            setTermsAccepted(false);
            setMetadata({
                propertyAddress: '',
                landlordName: '',
                startDate: '',
                monthlyRent: '',
            });

        } catch (err) {
            console.error('Upload failed:', err);
            setError(err.message || t('upload.uploadFailed'));
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 בייט';
        const k = 1024;
        const sizes = ['בייט', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="upload-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="upload-container">
                <div className="upload-header animate-fadeIn">
                    <h1>{t('upload.title')}</h1>
                    <p>{t('upload.subtitle')}</p>
                </div>

                {uploadSuccess && (
                    <Card variant="glass" padding="md" className="success-card animate-slideUp">
                        <div className="success-content">
                            <span className="success-icon">✅</span>
                            <div>
                                <h3>{t('upload.uploadSuccess')}</h3>
                                <p className="analyzing-status">
                                    <span className="mini-spinner"></span>
                                    {t('upload.analyzing')}
                                </p>
                                <p className="upload-confirm">{t('upload.uploadedToServer')}</p>
                                <p className="upload-confirm">{t('upload.analysisStarted')}</p>
                            </div>
                        </div>
                        <div className="success-actions">
                            <Button variant="primary" onClick={() => navigate('/contracts')}>
                                {t('upload.viewMyContracts')} {isRTL ? '←' : '→'}
                            </Button>
                            <Button variant="secondary" onClick={() => setUploadSuccess(false)}>
                                {t('upload.uploadAnother')}
                            </Button>
                        </div>
                    </Card>
                )}

                {!uploadSuccess && (
                    <div className="upload-content">
                        <Card
                            variant="glass"
                            padding="lg"
                            className={`drop-zone animate-slideUp ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => !file && fileInputRef.current?.click()}
                            style={{ cursor: file ? 'default' : 'pointer' }}
                        >
                            {!file ? (
                                <div className="drop-content">
                                    <div className="drop-icon">📄</div>
                                    <h3>{t('upload.dragDrop')}</h3>
                                    <p>{t('upload.or')}</p>
                                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                        {t('upload.selectFile')}
                                    </Button>
                                    <p className="drop-hint">{t('upload.maxSize')}</p>
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <div className="file-icon">📄</div>
                                    <div className="file-info">
                                        <div className="filename-edit">
                                            <input
                                                type="text"
                                                value={customFileName}
                                                onChange={(e) => setCustomFileName(e.target.value)}
                                                className="filename-input"
                                                placeholder={t('upload.contractName')}
                                            />
                                            <span className="filename-ext">.pdf</span>
                                        </div>
                                        <p>{formatFileSize(file.size)}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => { setFile(null); setCustomFileName(''); }} disabled={isUploading}>
                                        ✕
                                    </Button>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleInputChange}
                                style={{ display: 'none' }}
                            />

                            {isUploading && (
                                <div className="upload-progress">
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                    <p>{uploadProgress}% {uploadProgress < 100 ? t('upload.uploading') : t('upload.complete')}</p>
                                </div>
                            )}
                        </Card>

                        {error && <div className="error-message animate-slideUp">{error}</div>}

                        {file && !isUploading && (
                            <Card variant="elevated" padding="lg" className="metadata-card animate-slideUp">
                                <h3>{t('upload.contractDetails')}</h3>
                                <div className="metadata-grid">
                                    <Input
                                        label={t('upload.propertyAddress')}
                                        placeholder={t('upload.addressPlaceholder')}
                                        value={metadata.propertyAddress}
                                        onChange={(e) => setMetadata({ ...metadata, propertyAddress: e.target.value })}
                                    />
                                    <Input
                                        label={t('upload.landlordName')}
                                        placeholder={t('upload.landlordPlaceholder')}
                                        value={metadata.landlordName}
                                        onChange={(e) => setMetadata({ ...metadata, landlordName: e.target.value })}
                                    />
                                </div>
                            </Card>
                        )}

                        {/* Terms Checkbox */}
                        {file && !isUploading && (
                            <div className="terms-section animate-slideUp">
                                <label className="terms-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                    />
                                    <span className="terms-text">
                                        {t('upload.termsLabel')}{' '}
                                        <button
                                            type="button"
                                            className="terms-link"
                                            onClick={() => setShowTermsModal(true)}
                                        >
                                            {t('upload.termsLink')}
                                        </button>
                                    </span>
                                </label>
                            </div>
                        )}

                        {file && !isUploading && (
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={handleUpload}
                                className="upload-button animate-slideUp"
                                disabled={!termsAccepted}
                            >
                                {t('upload.uploadBtn')}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Terms Modal - rendered via Portal for full screen overlay */}
            {showTermsModal && ReactDOM.createPortal(
                <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}>
                    <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="terms-modal-header">
                            <h2>{t('upload.termsTitle')}</h2>
                            <button className="terms-modal-close" onClick={() => setShowTermsModal(false)}>✕</button>
                        </div>
                        <div className="terms-modal-content">
                            <h3>{t('upload.terms1Title')}</h3>
                            <p>{t('upload.terms1Content')}</p>

                            <h3>{t('upload.terms2Title')}</h3>
                            <p>{t('upload.terms2Content')}</p>

                            <h3>{t('upload.terms3Title')}</h3>
                            <p>{t('upload.terms3Content')}</p>

                            <h3>{t('upload.terms4Title')}</h3>
                            <p>{t('upload.terms4Content')}</p>

                            <h3>{t('upload.terms5Title')}</h3>
                            <p>{t('upload.terms5Content')}</p>

                            <h3>{t('upload.terms6Title')}</h3>
                            <p>{t('upload.terms6Content')}</p>
                        </div>
                        <div className="terms-modal-footer">
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setTermsAccepted(true);
                                    setShowTermsModal(false);
                                }}
                            >
                                {t('upload.iAgree')}
                            </Button>
                            <Button variant="secondary" onClick={() => setShowTermsModal(false)}>
                                {t('upload.close')}
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UploadPage;
