/**
 * ============================================
 *  ExportService
 *  Word & PDF Report Generation
 * ============================================
 * 
 * STRUCTURE:
 * - exportToWord: Full Hebrew RTL Word document
 * - exportToPDF: PDF with visual gauges (English only)
 * - exportEditedContract: Export edited clauses with highlights
 * - exportEditedContractWithSignatures: Full contract with signature section
 * 
 * DEPENDENCIES:
 * - docx: Word document generation (Hebrew RTL support)
 * - jsPDF: PDF generation
 * - file-saver: Browser file download
 * 
 * NOTES:
 * - PDF export has limited Hebrew support - use Word for full Hebrew
 * - Edited clauses are highlighted in yellow
 * - Signature version includes landlord/tenant signature blocks
 * 
 * ============================================
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

// ============================================
// WORD EXPORT
// ============================================

/**
 * Export analysis to Word document (Full Hebrew Support)
 */
export const exportToWord = async (analysis, fileName = 'Contract_Analysis_Report') => {
    const result = analysis?.analysis_result || analysis;
    const riskScore = result?.overall_risk_score || 0;
    const issues = result?.issues || [];
    const summary = result?.summary || 'Analysis complete.';
    const breakdown = result?.score_breakdown || {};

    // Create document sections
    const sections = [];

    // Title - Hebrew RTL
    sections.push(
        new Paragraph({
            text: 'דוח ניתוח חוזה שכירות',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        }),
        new Paragraph({
            text: `Contract Analysis Report`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            text: `נוצר בתאריך: ${new Date().toLocaleDateString('he-IL')}`,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
        })
    );

    // Overall Score
    sections.push(
        new Paragraph({
            text: 'הערכת סיכון כללית',
            heading: HeadingLevel.HEADING_1,
            bidirectional: true,
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'ציון סיכון: ', bold: true, rightToLeft: true }),
                new TextRun({ text: `${riskScore}/100`, bold: true, size: 32 }),
            ],
            bidirectional: true,
            spacing: { after: 200 },
        }),
        new Paragraph({
            text: summary,
            bidirectional: true,
            spacing: { after: 400 },
        })
    );

    // Score Breakdown Table
    if (Object.keys(breakdown).length > 0) {
        sections.push(
            new Paragraph({
                text: 'פירוט ציון לפי קטגוריות',
                heading: HeadingLevel.HEADING_2,
                bidirectional: true,
            })
        );

        const categoryNames = {
            financial_terms: 'תנאים פיננסיים',
            tenant_rights: 'זכויות הדייר',
            termination_clauses: 'סיום ויציאה',
            liability_repairs: 'אחריות ותיקונים',
            legal_compliance: 'עמידה בחוק',
        };

        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: 'קטגוריה', bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: 'ציון', bold: true })] }),
                ],
            }),
        ];

        Object.entries(breakdown).forEach(([key, data]) => {
            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(categoryNames[key] || key)] }),
                        new TableCell({ children: [new Paragraph(`${data.score || 0}/20`)] }),
                    ],
                })
            );
        });

        sections.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({ spacing: { after: 400 } })
        );
    }

    // Issues Section
    if (issues.length > 0) {
        sections.push(
            new Paragraph({
                text: `בעיות שנמצאו (${issues.length})`,
                heading: HeadingLevel.HEADING_1,
                bidirectional: true,
            })
        );

        issues.forEach((issue, idx) => {
            sections.push(
                new Paragraph({
                    text: `${idx + 1}. ${issue.clause_topic}`,
                    heading: HeadingLevel.HEADING_2,
                    bidirectional: true,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'רמת סיכון: ', bold: true, rightToLeft: true }),
                        new TextRun({ text: issue.risk_level || 'Medium' }),
                        issue.rule_id && new TextRun({ text: ` | כלל: ${issue.rule_id}` }),
                        issue.penalty_points && new TextRun({ text: ` | קנס: -${issue.penalty_points}` }),
                    ].filter(Boolean),
                    bidirectional: true,
                })
            );

            if (issue.original_text) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'סעיף מקורי: ', bold: true, rightToLeft: true }),
                        ],
                        bidirectional: true,
                    }),
                    new Paragraph({
                        text: `"${issue.original_text}"`,
                        italics: true,
                        bidirectional: true,
                        spacing: { after: 100 },
                    })
                );
            }

            if (issue.legal_basis) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'בסיס חוקי: ', bold: true, rightToLeft: true }),
                            new TextRun({ text: issue.legal_basis, rightToLeft: true }),
                        ],
                        bidirectional: true,
                    })
                );
            }

            if (issue.explanation) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'הסבר: ', bold: true, rightToLeft: true }),
                            new TextRun({ text: issue.explanation, rightToLeft: true }),
                        ],
                        bidirectional: true,
                    })
                );
            }

            if (issue.suggested_fix) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'הצעה לתיקון: ', bold: true, rightToLeft: true }),
                            new TextRun({ text: issue.suggested_fix, rightToLeft: true }),
                        ],
                        bidirectional: true,
                        spacing: { after: 300 },
                    })
                );
            }
        });
    }

    // Create and save document
    const doc = new Document({
        sections: [{
            properties: {},
            children: sections,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};

// ============================================
// PDF EXPORT
// ============================================

/**
 * Export analysis to PDF document
 * Note: For Hebrew, use Word export for better formatting
 * PDF uses basic visualization without Hebrew text
 */
export const exportToPDF = async (analysis, fileName = 'Contract_Analysis_Report') => {
    const result = analysis?.analysis_result || analysis;
    const riskScoreRaw = result?.overall_risk_score;
    const riskScore = Math.max(0, Math.min(100, Math.round(Number(riskScoreRaw) || 0)));
    const issues = result?.issues || [];
    const breakdown = result?.score_breakdown || {};

    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 2 * margin;

    // Helper to add new page if needed
    const checkPageBreak = (neededHeight = 20) => {
        if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 20;
        }
    };

    // --- HEADER ---
    doc.setFillColor(13, 17, 23); // Dark background
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RentGuard 360', margin, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    // doc.setTextColor(150, 150, 150);
    doc.text('AI Contract Analysis Report', margin, 28);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 20, { align: 'right' });

    y = 55;

    // --- WARNING FOR HEBREW ---
    doc.setFillColor(255, 243, 205);
    doc.setDrawColor(255, 238, 186);
    doc.rect(margin, y, contentWidth, 12, 'FD');
    doc.setTextColor(133, 100, 4);
    doc.setFontSize(9);
    doc.text('Note: For full Hebrew text support, please use the Word export option.', margin + 5, y + 7);
    y += 25;

    // --- OVERALL RISK SCORE ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Assessment', margin, y);
    y += 10;

    // Draw visual gauge background
    const gaugeWidth = contentWidth;
    const gaugeHeight = 10;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin, y, gaugeWidth, gaugeHeight, 5, 5, 'F');

    // Calculate score width
    const scoreWidth = (riskScore / 100) * gaugeWidth;

    // Determine color (match app legend: higher score = safer = greener)
    let r, g, b;
    if (riskScore >= 86) { r = 34; g = 197; b = 94; }          // Green
    else if (riskScore >= 71) { r = 16; g = 185; b = 129; }    // Light green
    else if (riskScore >= 51) { r = 245; g = 158; b = 11; }    // Orange
    else { r = 239; g = 68; b = 68; }                          // Red

    doc.setFillColor(r, g, b);
    doc.roundedRect(margin, y, Math.max(scoreWidth, 5), gaugeHeight, 5, 5, 'F');

    y += 18;
    doc.setFontSize(28);
    doc.setTextColor(r, g, b);
    doc.text(`${riskScore}`, margin, y);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('/ 100 Risk Score', margin + 15 + (riskScore.toString().length * 10), y);

    y += 20;

    // --- SCORE BREAKDOWN ---
    if (Object.keys(breakdown).length > 0) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Category Breakdown', margin, y);
        y += 10;

        const categoryNames = {
            financial_terms: 'Financial Terms',
            tenant_rights: 'Tenant Rights',
            termination_clauses: 'Termination & Exit',
            liability_repairs: 'Liability & Repairs',
            legal_compliance: 'Legal Compliance',
        };

        // Draw refined table-like structure
        Object.entries(breakdown).forEach(([key, data]) => {
            checkPageBreak(15);
            const score = data.score || 0;
            const fullScore = 20;
            const pct = score / fullScore;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            doc.text(categoryNames[key] || key, margin, y);

            // Mini bar
            const barW = 80;
            const barH = 4;
            const barX = margin + 50;
            const barY = y - 3;

            doc.setFillColor(230, 230, 230);
            doc.rect(barX, barY, barW, barH, 'F');

            // Fill (higher score = greener)
            let cr, cg, cb;
            const pctScore = Math.max(0, Math.min(100, Math.round((score / fullScore) * 100)));
            if (pctScore >= 86) { cr = 34; cg = 197; cb = 94; }
            else if (pctScore >= 71) { cr = 16; cg = 185; cb = 129; }
            else if (pctScore >= 51) { cr = 245; cg = 158; cb = 11; }
            else { cr = 239; cg = 68; cb = 68; }

            doc.setFillColor(cr, cg, cb);
            doc.rect(barX, barY, barW * pct, barH, 'F');

            doc.setTextColor(0, 0, 0);
            doc.text(`${score}/${fullScore}`, barX + barW + 10, y);

            y += 10;
        });
    }

    y += 15;

    // --- ISSUES FOUND ---
    if (issues.length > 0) {
        checkPageBreak(40);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 15;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Identified Issues (${issues.length})`, margin, y);
        y += 15;

        issues.forEach((issue, idx) => {
            checkPageBreak(40);

            // Risk Badge
            const riskLevel = issue.risk_level || 'Medium';
            let badgeColor = [255, 193, 7]; // Yellow
            if (riskLevel === 'High' || riskLevel === 'Critical') badgeColor = [220, 53, 69]; // Red
            if (riskLevel === 'Low') badgeColor = [40, 167, 69]; // Green

            doc.setFillColor(...badgeColor);
            doc.roundedRect(margin, y - 4, 20, 6, 2, 2, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(riskLevel.toUpperCase(), margin + 2, y);

            // Issue Title (sanitized for Hebrew chars)
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');

            // If topic has Hebrew, show generic
            const hasHebrew = /[\u0590-\u05FF]/.test(issue.clause_topic || '');
            const title = hasHebrew ? `Issue #${idx + 1}` : (issue.clause_topic || `Issue #${idx + 1}`);

            doc.text(title, margin + 25, y);

            // Points deduction
            if (issue.penalty_points) {
                doc.setTextColor(220, 53, 69);
                doc.text(`-${issue.penalty_points} pts`, pageWidth - margin, y, { align: 'right' });
            }

            y += 8;

            // Details
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);

            // Add Explanation if not Hebrew, otherwise static message
            // Note: issue.explanation is likely Hebrew.

            doc.text('Refer to the Word document for full explanation and original clause text.', margin, y);
            y += 5;
            doc.text('This issue impacts your protection score.', margin, y);

            y += 15;
        });
    }

    // --- FOOTER ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount} | RentGuard 360`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`${fileName}.pdf`);
};

// ============================================
// EDITED CONTRACT EXPORT
// ============================================

/**
 * Export edited contract to Word with Hebrew RTL support
 * @param {string} originalText - Original contract text
 * @param {object} editedClauses - Object with clauseId -> { text, action }
 * @param {array} issues - Issues with suggested fixes
 * @param {string} fileName - Output file name
 * @param {array} backendClauses - Optional: clauses array from backend (preferred)
 */
export const exportEditedContract = async (originalText, editedClauses, ISSUES = [], fileName = 'Edited_Contract', backendClauses = []) => {
    const sections = [];
    void ISSUES;

    // Title
    sections.push(
        new Paragraph({
            text: 'חוזה שכירות מתוקן',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        }),
        new Paragraph({
            text: `נערך בתאריך: ${new Date().toLocaleDateString('he-IL')}`,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
        })
    );

    // Summary of changes
    const changesCount = Object.keys(editedClauses).length;
    if (changesCount > 0) {
        sections.push(
            new Paragraph({
                text: `סיכום שינויים: ${changesCount} סעיפים נערכו`,
                bidirectional: true,
                spacing: { after: 300 },
            })
        );
    }

    // Use backend clauses if available, otherwise fall back to client-side parsing
    let clauses = [];
    if (backendClauses && backendClauses.length > 0) {
        console.log('Export: Using backend clauses:', backendClauses.length);
        clauses = backendClauses.map(text => typeof text === 'string' ? text.trim() : text);
    } else if (originalText) {
        console.log('Export: Falling back to client-side parsing');
        clauses = originalText
            .split(/\n\n+|\n(?=\d+\.\s)/)
            .filter(p => p.trim().length > 0)
            .map(p => p.trim());
    }

    clauses.forEach((clauseText, index) => {
        const clauseId = `clause-${index}`;
        const edit = editedClauses[clauseId];

        // Determine final text
        let finalText = clauseText;
        let wasEdited = false;

        if (edit) {
            if (edit.action === 'accepted' || edit.action === 'edited') {
                finalText = edit.text;
                wasEdited = true;
            }
        }

        // Add clause to document with proper paragraph spacing
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: finalText,
                        rightToLeft: true,
                        highlight: wasEdited ? 'yellow' : undefined, // Highlight edited clauses
                    }),
                ],
                bidirectional: true,
                spacing: {
                    after: 300,  // Space after each paragraph
                    line: 360,   // 1.5 line spacing for readability
                },
            })
        );

        // Note if clause was changed
        if (wasEdited) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `[סעיף זה ${edit.action === 'accepted' ? 'אושר עם תיקון AI' : 'נערך ידנית'}]`,
                            italics: true,
                            size: 20,
                            color: '666666',
                            rightToLeft: true,
                        }),
                    ],
                    bidirectional: true,
                    spacing: { after: 200 },
                })
            );
        }
    });

    // Footer
    sections.push(
        new Paragraph({
            text: '---',
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
            text: 'RentGuard 360 מסמך זה נוצר באמצעות',
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        })
    );

    // Create and save document
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, bottom: 720, left: 720, right: 720 },
                }
            },
            children: sections,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};

// ============================================
// CONTRACT WITH SIGNATURES
// ============================================

/**
 * Export edited contract to Word WITH SIGNATURES
 * @param {array} clauseTexts - Array of clause texts (already edited)
 * @param {object} editedClauses - Object with clauseId -> { text, action }
 * @param {string} fileName - Output file name
 */
export const exportEditedContractWithSignatures = async (clauseTexts, editedClauses, fileName = 'חוזה_שכירות') => {
    const sections = [];

    // ===== HEADER =====
    sections.push(
        new Paragraph({
            text: 'חוזה שכירות בלתי מוגנת',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        }),
        new Paragraph({
            text: `נערך ונחתם ביום: ${new Date().toLocaleDateString('he-IL')}`,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 600 },
        })
    );

    // ===== CONTRACT CLAUSES =====
    clauseTexts.forEach((text, index) => {
        const clauseId = `clause-${index}`;
        const edit = editedClauses[clauseId];
        const wasEdited = edit && (edit.action === 'accepted' || edit.action === 'edited');

        let displayText = text;

        // For edited clauses, prepend the original clause number if available
        if (wasEdited && edit.originalNumber) {
            // Check if the text doesn't already start with a number
            if (!text.match(/^\d+\.\s*/)) {
                displayText = `${edit.originalNumber} ${text}`;
            }
        }

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: displayText,
                        rightToLeft: true,
                        highlight: wasEdited ? 'yellow' : undefined,
                    }),
                ],
                bidirectional: true,
                spacing: {
                    after: 300,
                    line: 360,
                },
            })
        );
    });

    // ===== SIGNATURE SECTION =====
    sections.push(
        new Paragraph({
            spacing: { before: 800 },
        }),
        new Paragraph({
            text: '─────────────────────────────────────────────────',
            alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
            text: 'חתימות',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { before: 400, after: 400 },
        })
    );

    // Side-by-side signature table (Landlord on right, Tenant on left - RTL)
    const signatureTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: 'none' },
            bottom: { style: 'none' },
            left: { style: 'none' },
            right: { style: 'none' },
            insideHorizontal: { style: 'none' },
            insideVertical: { style: 'none' },
        },
        rows: [
            // Headers row with underlines
            new TableRow({
                children: [
                    // Tenant (left column in visual, but first in RTL table)
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } },
                        children: [
                            new Paragraph({
                                text: '________________',
                                alignment: AlignmentType.CENTER,
                            }),
                            new Paragraph({
                                text: 'השוכר',
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                spacing: { after: 200 },
                            }),
                        ],
                    }),
                    // Landlord (right column in visual)
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } },
                        children: [
                            new Paragraph({
                                text: '________________',
                                alignment: AlignmentType.CENTER,
                            }),
                            new Paragraph({
                                text: 'המשכיר',
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                spacing: { after: 200 },
                            }),
                        ],
                    }),
                ],
            }),
            // Name row
            new TableRow({
                children: [
                    new TableCell({
                        borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'שם: ', rightToLeft: true }),
                                    new TextRun({ text: '________________' }),
                                ],
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                spacing: { after: 150 },
                            }),
                        ],
                    }),
                    new TableCell({
                        borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'שם: ', rightToLeft: true }),
                                    new TextRun({ text: '________________' }),
                                ],
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                spacing: { after: 150 },
                            }),
                        ],
                    }),
                ],
            }),
            // ID row
            new TableRow({
                children: [
                    new TableCell({
                        borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'ת.ז.: ', rightToLeft: true }),
                                    new TextRun({ text: '________________' }),
                                ],
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                spacing: { after: 150 },
                            }),
                        ],
                    }),
                    new TableCell({
                        borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } },
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'ת.ז.: ', rightToLeft: true }),
                                    new TextRun({ text: '________________' }),
                                ],
                                alignment: AlignmentType.CENTER,
                                bidirectional: true,
                                spacing: { after: 150 },
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });

    sections.push(signatureTable);

    // Date at center bottom
    sections.push(
        new Paragraph({
            spacing: { before: 400 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'תאריך: ', rightToLeft: true }),
                new TextRun({ text: '________________' }),
            ],
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
        })
    );

    // Footer
    sections.push(
        new Paragraph({
            spacing: { before: 600 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: 'מסמך זה נוצר באמצעות RentGuard 360',
                    size: 18,
                    color: '888888',
                    rightToLeft: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        })
    );

    // Create document
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, bottom: 720, left: 720, right: 720 },
                }
            },
            children: sections,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};

export default {
    exportToWord,
    exportToPDF,
    exportEditedContract,
    exportEditedContractWithSignatures,
};
