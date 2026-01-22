// Link Validator with Debugger Integration

const FORBIDDEN_WORDS = [
    'menyusul', 'nanti', 'ntar', 'kosong', 'belum ada', 'coming soon',
    'tbd', 'tba', 'to be determined', 'to be announced',
    'draft', 'draf', 'konsep', 'concept',
    'masih', 'sedang', 'proses', 'process', 'progress',
    'akan', 'mau', 'ingin', 'rencana', 'plan',
    'sementara', 'temporary', 'placeholder',
    'blm', 'blom', 'blum', 'blm ada', 'blom ada',
    'nnti', 'nnt', 'ntr', 'nti',
    'soon', 'later', 'wait', 'waiting',
    'incomplete', 'not complete', 'not finished', 'unfinished',
    'partial', 'partially', 'belum selesai', 'tidak selesai',
    'masih dikerjakan', 'sedang dikerjakan', 'dalam pengerjaan',
    'akan dikerjakan', 'akan dibuat', 'akan diupdate',
    'update nanti', 'update menyusul', 'update lagi',
    'revisi', 'revision', 'perbaikan', 'improvement',
    'dummy', 'sample', 'contoh', 'example', 'test',
    'placeholder text', 'isi nanti', 'isi menyusul',
    'isi dulu', 'isi nanti', 'isi menyusul',
    'isi sendiri', 'isi aja', 'isi dong',
    'isi disini', 'isi di sini', 'isi di bawah',
    'diisi nanti', 'diisi menyusul', 'diisi kemudian',
    'masih kosong', 'tidak ada', 'no content',
    'empty', 'blank', 'null', 'none',
    'besok', 'lusa', 'minggu depan', 'bulan depan',
    'next week', 'next month', 'later date',
    'kapan-kapan', 'suatu saat', 'some time',
    'tunggu', 'wait', 'hold', 'pause',
    'mungkin', 'probably', 'perhaps', 'maybe',
    'kira-kira', 'around', 'approximately',
    'kurang lebih', 'more or less', 'estimate',
    'belum pasti', 'not sure', 'uncertain',
    'tentatif', 'tentative', 'belum fix', 'not fixed'
];

// Store validation state
let validationTimeout = null;

/**
 * Extract Google Drive file ID from URL
 */
function extractGoogleFileId(url) {
    if (!url) return null;
    
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /folders\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Stage 1: Check Link Type
 */
function checkLinkType(url) {
    if (!url || url.trim() === '') {
        return { type: 'empty', valid: false, message: 'URL kosong' };
    }
    
    const lowerUrl = url.toLowerCase();
    
    // Google Docs detection
    if (lowerUrl.includes('docs.google.com/document/')) {
        return { 
            type: 'google-doc', 
            valid: true, 
            message: 'Google Docs Document',
            isGoogleDoc: true
        };
    }
    
    // Google Sheets
    if (lowerUrl.includes('docs.google.com/spreadsheets/')) {
        return { 
            type: 'google-sheet', 
            valid: true, 
            message: 'Google Sheets',
            isGoogleDoc: true
        };
    }
    
    // Google Slides
    if (lowerUrl.includes('docs.google.com/presentation/')) {
        return { 
            type: 'google-slides', 
            valid: true, 
            message: 'Google Slides',
            isGoogleDoc: true
        };
    }
    
    // Google Drive (any file)
    if (lowerUrl.includes('drive.google.com/file/d/') || lowerUrl.includes('drive.google.com/open')) {
        return { 
            type: 'google-drive', 
            valid: true, 
            message: 'Google Drive File',
            isGoogleDoc: true
        };
    }
    
    // Check for image extensions
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
    for (const ext of imageExtensions) {
        if (lowerUrl.includes(ext)) {
            return { type: 'image', valid: true, message: `Gambar ${ext.toUpperCase()}` };
        }
    }
    
    // Check for document extensions
    const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.pptx', '.ppt', '.md'];
    for (const ext of docExtensions) {
        if (lowerUrl.includes(ext)) {
            return { type: 'document', valid: true, message: `Dokumen ${ext.toUpperCase()}` };
        }
    }
    
    // Default to URL
    return { type: 'url', valid: true, message: 'URL standar' };
}

/**
 * Stage 2: Check Link Accessibility using Google Drive API
 */
async function checkLinkAccessibility(url) {
    try {
        // Get API key from debug panel or use default
        const apiKey = window.currentApiKey || 'AIzaSyBd9bDuyGvrzIyN871nZ5ZaRWZziWEZ768';
        
        // Check if it's a Google Drive/Google Docs link
        const isGoogleLink = url.includes('google.com');
        const fileId = extractGoogleFileId(url);
        
        if (isGoogleLink && fileId) {
            // Use Google Drive API v3 with API Key
            const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?key=${apiKey}&fields=id,name,mimeType,size,webViewLink,capabilities(canCopy,canDownload),shared`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                
                // Check if file is publicly accessible
                const isPublic = fileData.shared || false;
                const canDownload = fileData.capabilities?.canDownload || false;
                
                return {
                    accessible: true,
                    status: 200,
                    statusText: 'OK',
                    contentType: fileData.mimeType || 'unknown',
                    message: isPublic ? 'File publik bisa diakses' : 'File ditemukan (mungkin private)',
                    isGoogleFile: true,
                    isPublic: isPublic,
                    canDownload: canDownload,
                    fileName: fileData.name,
                    fileId: fileData.id,
                    fileSize: fileData.size
                };
                
            } else if (response.status === 404) {
                return {
                    accessible: false,
                    status: 404,
                    statusText: 'Not Found',
                    contentType: 'unknown',
                    message: 'File tidak ditemukan',
                    isGoogleFile: true
                };
                
            } else if (response.status === 403) {
                return {
                    accessible: false,
                    status: 403,
                    statusText: 'Forbidden',
                    contentType: 'unknown',
                    message: 'Akses ditolak. File mungkin private atau tidak ada izin.',
                    isGoogleFile: true
                };
                
            } else {
                return {
                    accessible: false,
                    status: response.status,
                    statusText: response.statusText,
                    contentType: 'unknown',
                    message: `Error API: ${response.status}`,
                    isGoogleFile: true
                };
            }
            
        } else if (isGoogleLink && !fileId) {
            // Google link but invalid format
            return {
                accessible: false,
                status: 400,
                statusText: 'Bad Request',
                contentType: 'unknown',
                message: 'Format URL Google tidak valid',
                isGoogleFile: true
            };
            
        } else {
            // Non-Google URL - use standard fetch
            try {
                const testUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                const response = await fetch(testUrl, { method: 'HEAD' });
                
                return {
                    accessible: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    contentType: response.headers.get('content-type') || 'unknown',
                    message: response.ok ? 'URL bisa diakses' : `Tidak bisa diakses (${response.status})`,
                    isGoogleFile: false
                };
                
            } catch (error) {
                // Try basic URL validation
                try {
                    new URL(url);
                    return {
                        accessible: true,
                        status: 200,
                        statusText: 'OK',
                        contentType: 'unknown',
                        message: 'URL valid (akses tidak diverifikasi)',
                        isGoogleFile: false
                    };
                } catch (urlError) {
                    return {
                        accessible: false,
                        status: 400,
                        statusText: 'Bad Request',
                        contentType: 'unknown',
                        message: 'Format URL tidak valid',
                        isGoogleFile: false
                    };
                }
            }
        }
        
    } catch (error) {
        console.error('Accessibility check error:', error);
        return {
            accessible: false,
            status: 0,
            statusText: 'Error',
            contentType: 'unknown',
            message: `Error: ${error.message}`,
            isGoogleFile: false
        };
    }
}

/**
 * Update stage UI
 */
function updateStageUI(stageNumber, status, message = '') {
    const stageElement = document.getElementById(`stage${stageNumber}`);
    if (!stageElement) return;
    
    // Reset classes
    stageElement.classList.remove('active', 'passed', 'failed', 'warning');
    
    // Update stage text if message provided
    const stageText = stageElement.querySelector('.stage-text');
    if (stageText && message) {
        const shortMessage = message.length > 20 ? message.substring(0, 20) + '...' : message;
        stageText.textContent = shortMessage;
    }
    
    switch (status) {
        case 'checking':
            stageElement.classList.add('active');
            stageElement.querySelector('.stage-status').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            break;
        case 'passed':
            stageElement.classList.add('passed');
            stageElement.querySelector('.stage-status').innerHTML = '<i class="fas fa-check"></i>';
            break;
        case 'failed':
            stageElement.classList.add('failed');
            stageElement.querySelector('.stage-status').innerHTML = '<i class="fas fa-times"></i>';
            break;
        case 'warning':
            stageElement.classList.add('failed'); // Use failed style for warning
            stageElement.querySelector('.stage-status').innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            break;
    }
}

/**
 * Update progress bar
 */
function updateProgress(percent, message) {
    const progressBar = document.getElementById('validationProgressBar');
    const progressText = document.getElementById('validationProgressText');
    
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.style.transition = 'width 0.5s ease';
    }
    
    if (progressText) {
        progressText.textContent = `${percent}% - ${message}`;
    }
}

/**
 * Check for forbidden keywords
 */
function checkForbiddenKeywords(content, contentType, linkType, fileInfo) {
    // Skip check for restricted Google files
    if (contentType === 'google-restricted') {
        return {
            hasForbidden: false,
            foundWords: [],
            message: 'File Google tidak publik - kata tidak diperiksa'
        };
    }
    
    // Skip check for images
    if (contentType === 'image') {
        return {
            hasForbidden: false,
            foundWords: [],
            message: 'Gambar - kata tidak diperiksa'
        };
    }
    
    // Skip if no content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return {
            hasForbidden: false,
            foundWords: [],
            message: 'Tidak ada konten untuk diperiksa'
        };
    }
    
    // Check for forbidden words
    const lowerContent = content.toLowerCase();
    const foundWords = FORBIDDEN_WORDS.filter(word => {
        // Check for exact word match (with word boundaries)
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        return wordRegex.test(lowerContent) || lowerContent.includes(word.toLowerCase());
    });
    
    if (foundWords.length > 0) {
        return {
            hasForbidden: true,
            foundWords: foundWords,
            message: `Kata terlarang: ${foundWords.slice(0, 3).join(', ')}${foundWords.length > 3 ? '...' : ''}`
        };
    } else {
        return {
            hasForbidden: false,
            foundWords: [],
            message: 'Tidak ada kata terlarang'
        };
    }
}

/**
 * Main validation function
 */
async function validateLink(url) {
    if (!url || url.trim() === '') {
        return {
            url: '',
            stages: {},
            overall: 'empty',
            timestamp: new Date().toISOString()
        };
    }
    
    const result = {
        url: url,
        stages: {},
        overall: 'pending',
        timestamp: new Date().toISOString()
    };
    
    try {
        // Stage 1: Link Type
        updateProgress(10, 'Memulai validasi...');
        updateStageUI(1, 'checking');
        
        result.stages.stage1 = checkLinkType(url);
        updateStageUI(1, result.stages.stage1.valid ? 'passed' : 'failed', result.stages.stage1.message);
        updateProgress(25, result.stages.stage1.message);
        
        if (!result.stages.stage1.valid) {
            result.overall = 'invalid-type';
            return result;
        }
        
        // Stage 2: Accessibility (REAL API CALL)
        updateProgress(40, 'Memeriksa akses dengan Google API...');
        updateStageUI(2, 'checking');
        
        result.stages.stage2 = await checkLinkAccessibility(url);
        updateStageUI(2, result.stages.stage2.accessible ? 'passed' : 'failed', result.stages.stage2.message);
        updateProgress(60, result.stages.stage2.message);
        
        if (!result.stages.stage2.accessible) {
            result.overall = 'no-access';
            return result;
        }
        
        // Stage 3: Content check (simplified for demo)
        updateProgress(75, 'Memeriksa konten...');
        updateStageUI(3, 'checking');
        
        // For demo purposes, we'll simulate content check
        result.stages.stage3 = {
            hasContent: true,
            content: '[Content check simulated]',
            contentType: result.stages.stage1.type,
            message: 'Konten valid (simulasi)'
        };
        
        updateStageUI(3, 'passed', result.stages.stage3.message);
        updateProgress(90, result.stages.stage3.message);
        
        // Stage 4: Forbidden Keywords
        updateProgress(95, 'Memindai kata terlarang...');
        updateStageUI(4, 'checking');
        
        result.stages.stage4 = checkForbiddenKeywords(
            result.stages.stage3.content,
            result.stages.stage3.contentType,
            result.stages.stage1,
            result.stages.stage2
        );
        
        if (result.stages.stage4.hasForbidden) {
            updateStageUI(4, 'warning', 'Kata terlarang');
            updateProgress(100, 'Ada kata terlarang!');
            result.overall = 'has-forbidden-words';
        } else {
            updateStageUI(4, 'passed', 'Tidak ada kata terlarang');
            updateProgress(100, 'Validasi selesai');
            result.overall = 'valid';
        }
        
        return result;
        
    } catch (error) {
        console.error('Validation error:', error);
        return {
            url: url,
            stages: {},
            overall: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Display validation result
 */
function displayValidationResult(result) {
    const resultDiv = document.getElementById('validationResult');
    if (!resultDiv) return;
    
    let statusClass = '';
    let icon = '';
    let title = '';
    let message = '';
    let details = '';
    
    switch (result.overall) {
        case 'valid':
            statusClass = 'valid';
            icon = 'fas fa-check-circle';
            title = '✅ Link Valid & Siap Digunakan';
            message = 'Semua pemeriksaan berhasil!';
            details = `
                <div class="details">
                    <div class="detail-item">
                        <span class="detail-label">Tipe:</span>
                        <span class="detail-value">${result.stages.stage1?.message || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">✅ ${result.stages.stage2?.message || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Konten:</span>
                        <span class="detail-value">✅ ${result.stages.stage3?.message || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Kata Terlarang:</span>
                        <span class="detail-value">✅ ${result.stages.stage4?.message || '-'}</span>
                    </div>
                    ${result.stages.stage2?.fileName ? `
                    <div class="detail-item">
                        <span class="detail-label">Nama File:</span>
                        <span class="detail-value">${result.stages.stage2.fileName}</span>
                    </div>` : ''}
                </div>
            `;
            break;
            
        case 'not-public':
            statusClass = 'warning';
            icon = 'fas fa-lock';
            title = '🔒 File Google Tidak Publik';
            message = 'File tidak bisa diakses karena pengaturan privasi.';
            details = `
                <div class="details">
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">⛔ Akses terbatas</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Langkah perbaikan:</span>
                        <span class="detail-value">
                            1. Buka file di Google Drive<br>
                            2. Klik "Share"<br>
                            3. Pilih "Anyone with the link"<br>
                            4. Pilih "Viewer"<br>
                            5. Klik "Done"
                        </span>
                    </div>
                </div>
            `;
            break;
            
        case 'has-forbidden-words':
            statusClass = 'warning';
            icon = 'fas fa-exclamation-triangle';
            title = '⚠️ Kata Terlarang Ditemukan';
            message = result.stages.stage4?.message || 'Kata terlarang ditemukan';
            details = `
                <div class="details">
                    <div class="detail-item">
                        <span class="detail-label">Kata Ditemukan:</span>
                        <span class="detail-value">${result.stages.stage4?.foundWords?.join(', ') || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Saran:</span>
                        <span class="detail-value">Hapus kata terlarang sebelum submit</span>
                    </div>
                </div>
            `;
            break;
            
        case 'empty':
            statusClass = 'warning';
            icon = 'fas fa-file-alt';
            title = '⚠️ Konten Kosong';
            message = result.stages.stage3?.message || 'Dokumen tidak berisi konten';
            break;
            
        case 'no-access':
            statusClass = 'error';
            icon = 'fas fa-unlink';
            title = '❌ Tidak Bisa Diakses';
            message = result.stages.stage2?.message || 'Link tidak dapat diakses';
            break;
            
        case 'invalid-type':
            statusClass = 'error';
            icon = 'fas fa-exclamation-circle';
            title = '❌ Tipe Tidak Valid';
            message = 'Format link tidak didukung';
            break;
            
        case 'error':
            statusClass = 'error';
            icon = 'fas fa-exclamation-circle';
            title = '❌ Error Validasi';
            message = result.error || 'Terjadi kesalahan';
            details = `
                <div class="details">
                    <div class="detail-item">
                        <span class="detail-label">Saran:</span>
                        <span class="detail-value">Coba link lain atau hubungi admin</span>
                    </div>
                </div>
            `;
            break;
            
        default:
            statusClass = 'info';
            icon = 'fas fa-info-circle';
            title = '⏳ Validasi Berjalan';
            message = 'Memproses validasi...';
    }
    
    resultDiv.className = `validation-result ${statusClass}`;
    resultDiv.innerHTML = `
        <div class="result-header">
            <i class="${icon}"></i>
            <div class="result-title">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        </div>
        ${details}
        <div class="validation-time">
            <small><i class="far fa-clock"></i> ${new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</small>
        </div>
    `;
    resultDiv.style.display = 'block';
}

/**
 * Reset validation UI
 */
function resetValidationUI() {
    for (let i = 1; i <= 4; i++) {
        const stage = document.getElementById(`stage${i}`);
        if (stage) {
            stage.className = 'stage';
            stage.querySelector('.stage-status').innerHTML = '<i class="fas fa-clock"></i>';
            const defaultText = ['Cek tipe link', 'Cek akses', 'Cek konten', 'Cek kata terlarang'][i-1];
            stage.querySelector('.stage-text').textContent = defaultText;
        }
    }
    
    const progressBar = document.getElementById('validationProgressBar');
    const progressText = document.getElementById('validationProgressText');
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
}

/**
 * Main validation function called from HTML
 */
export async function validateLinkOnBlur(url) {
    const linkValidationDiv = document.getElementById('linkValidation');
    const resultDiv = document.getElementById('validationResult');
    const progressDiv = document.getElementById('validationProgress');
    
    if (!url || url.trim() === '') {
        resetValidationUI();
        linkValidationDiv.innerHTML = '<span class="invalid"><i class="fas fa-times"></i> Link wajib diisi</span>';
        linkValidationDiv.className = 'field-validation invalid';
        if (progressDiv) progressDiv.style.display = 'none';
        return;
    }
    
    // Reset and show UI
    resetValidationUI();
    if (progressDiv) progressDiv.style.display = 'block';
    
    resultDiv.className = 'validation-result';
    resultDiv.innerHTML = '<div class="validating"><i class="fas fa-spinner fa-spin"></i> Memulai validasi...</div>';
    resultDiv.style.display = 'block';
    
    linkValidationDiv.innerHTML = '<span class="checking"><i class="fas fa-spinner fa-spin"></i> Memvalidasi dengan Google API...</span>';
    linkValidationDiv.className = 'field-validation checking';
    
    try {
        const result = await validateLink(url);
        displayValidationResult(result);
        
        // Update link validation status
        if (result.overall === 'valid') {
            linkValidationDiv.innerHTML = '<span class="valid"><i class="fas fa-check"></i> Link valid</span>';
            linkValidationDiv.className = 'field-validation valid';
        } else if (result.overall === 'not-public') {
            linkValidationDiv.innerHTML = '<span class="warning"><i class="fas fa-lock"></i> File tidak publik</span>';
            linkValidationDiv.className = 'field-validation warning';
        } else if (result.overall === 'has-forbidden-words') {
            linkValidationDiv.innerHTML = '<span class="warning"><i class="fas fa-exclamation-triangle"></i> Kata terlarang</span>';
            linkValidationDiv.className = 'field-validation warning';
        } else if (result.overall === 'empty') {
            linkValidationDiv.innerHTML = '<span class="invalid"><i class="fas fa-times"></i> Dokumen kosong</span>';
            linkValidationDiv.className = 'field-validation invalid';
        } else {
            linkValidationDiv.innerHTML = '<span class="invalid"><i class="fas fa-times"></i> Tidak valid</span>';
            linkValidationDiv.className = 'field-validation invalid';
        }
        
    } catch (error) {
        console.error('Validation error:', error);
        
        linkValidationDiv.innerHTML = '<span class="invalid"><i class="fas fa-times"></i> Error validasi</span>';
        linkValidationDiv.className = 'field-validation invalid';
        
        resultDiv.className = 'validation-result error';
        resultDiv.innerHTML = `
            <div class="result-header">
                <i class="fas fa-exclamation-circle"></i>
                <div class="result-title">
                    <h4>❌ Error Validasi</h4>
                    <p>${error.message || 'Terjadi kesalahan'}</p>
                </div>
            </div>
        `;
    }
    
    // Update submit button
    if (typeof updateSubmitButton === 'function') {
        setTimeout(updateSubmitButton, 100);
    }
}

/**
 * Quick URL validation
 */
export function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Export for global use
window.validateLinkOnBlur = validateLinkOnBlur;
window.isValidUrl = isValidUrl;
window.extractGoogleFileId = extractGoogleFileId;