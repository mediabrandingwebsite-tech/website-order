// Form Submission Handler

// Mock imports if needed
const submitOrder = window.submitOrder || (async (data) => {
    console.log('Submitting order:', data);
    return { success: true, orderId: 'ORD-' + Date.now(), docId: 'doc-' + Math.random() };
});

const imageToBase64 = window.imageToBase64 || (async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
    });
});

const compressImage = window.compressImage || imageToBase64;

const showNotification = window.showNotification || function(message, type) {
    console.log(`Notification [${type}]: ${message}`);
    alert(`${type.toUpperCase()}: ${message}`);
};

// Form elements
const form = document.getElementById('orderForm');
const submitBtn = document.getElementById('submitBtn');
const submitSpinner = document.getElementById('submitSpinner');

/**
 * Handle form submission
 */
form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    if (submitBtn.disabled) return;
    
    // Show loading state
    submitBtn.disabled = true;
    submitSpinner.style.display = 'inline-block';
    
    try {
        // Collect form data
        const formData = collectFormData();
        
        // Process images if exists
        if (formData.referenceImageFiles && formData.referenceImageFiles.length > 0) {
            try {
                formData.referenceImages = await processImageFiles(formData.referenceImageFiles);
                delete formData.referenceImageFiles;
            } catch (error) {
                showNotification('Error gambar: ' + error.message, 'error');
                throw error;
            }
        }
        
        // Add metadata
        formData.createdAt = new Date().toISOString();
        formData.status = 'submitted';
        formData.ipAddress = await getIPAddress();
        formData.userAgent = navigator.userAgent;
        
        // Submit to Firebase
        const result = await submitOrder(formData);
        
        if (result.success) {
            // Show success
            showSuccessModal(result.orderId, result.docId);
            showNotification('Order berhasil disubmit!', 'success');
            
            // Reset form after delay
            setTimeout(resetForm, 1000);
        } else {
            throw new Error(result.error || 'Gagal submit order');
        }
        
    } catch (error) {
        console.error('Submission error:', error);
        showNotification('Error: ' + error.message, 'error');
        submitBtn.disabled = false;
    } finally {
        submitSpinner.style.display = 'none';
    }
});

/**
 * Collect data from form
 */
function collectFormData() {
    const imageFiles = document.getElementById('referenceImages').files;
    const kontenType = document.querySelector('input[name="kontenType"]:checked');
    
    // Get konten data based on type
    let kontenData = {};
    if (kontenType) {
        if (kontenType.value === 'link') {
            kontenData = {
                type: 'link',
                value: document.getElementById('kontenLink').value,
                isGoogleDocs: document.getElementById('kontenLink').value.includes('google.com'),
                validationResult: document.getElementById('validationResult')?.innerText || 'Not validated'
            };
        } else {
            kontenData = {
                type: 'text',
                value: document.getElementById('kontenText').value,
                length: document.getElementById('kontenText').value.length
            };
        }
    }
    
    return {
        timestamp: document.getElementById('timestamp').value,
        bidang: document.getElementById('bidang').value,
        bidangText: document.getElementById('bidang').options[document.getElementById('bidang').selectedIndex].text,
        tipeOrder: document.getElementById('tipeOrder').value,
        ukuran: {
            width: document.getElementById('ukuranWidth').value,
            height: document.getElementById('ukuranHeight').value,
            unit: document.getElementById('ukuranUnit').value,
            display: `${document.getElementById('ukuranWidth').value} x ${document.getElementById('ukuranHeight').value} ${document.getElementById('ukuranUnit').value}`
        },
        referenceImageFiles: Array.from(imageFiles),
        konten: kontenData,
        caption: document.getElementById('caption').value,
        deadline: {
            date: document.getElementById('deadlineDate').value,
            time: document.getElementById('deadlineTime').value,
            full: document.getElementById('deadlineDate').value + ' ' + document.getElementById('deadlineTime').value
        },
        contact: {
            name: document.getElementById('contactName').value,
            phone: document.getElementById('contactNumber').value
        }
    };
}

/**
 * Process multiple image files
 */
async function processImageFiles(files) {
    if (!files || files.length === 0) return [];
    
    const processedImages = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            // Validate file
            if (!file.type.startsWith('image/')) {
                throw new Error('File harus berupa gambar');
            }
            
            if (file.size > 10 * 1024 * 1024) { // 10MB
                // Compress large images
                const compressed = await compressImage(file, 0.7);
                processedImages.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: compressed,
                    compressed: true
                });
            } else {
                const base64 = await imageToBase64(file);
                processedImages.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: base64,
                    compressed: false
                });
            }
        } catch (error) {
            console.error(`Error processing image ${file.name}:`, error);
            throw new Error(`Gagal memproses gambar ${file.name}: ${error.message}`);
        }
    }
    
    return processedImages;
}

/**
 * Show success modal
 */
function showSuccessModal(orderId, docId) {
    const modal = document.getElementById('successModal');
    const orderIdDisplay = document.getElementById('orderIdDisplay');
    const countdownElement = document.getElementById('countdown');
    
    orderIdDisplay.textContent = orderId;
    modal.style.display = 'flex';
    
    // Start countdown
    let countdown = 5;
    const countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            redirectToSPS();
        }
    }, 1000);
    
    // Store order ID for SPS page
    localStorage.setItem('lastOrderId', docId);
    localStorage.setItem('lastOrderNumber', orderId);
}

/**
 * Get user IP address
 */
async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

/**
 * Reset form
 */
function resetForm() {
    // Reset form elements
    form.reset();
    
    // Reset file inputs
    document.getElementById('fileName').textContent = 'Belum ada file dipilih';
    document.getElementById('imagePreview').innerHTML = '';
    
    // Reset konten sections
    document.getElementById('linkInputGroup').style.display = 'none';
    document.getElementById('textInputGroup').style.display = 'none';
    document.getElementById('validationResult').innerHTML = '';
    document.getElementById('validationResult').style.display = 'none';
    const progressDiv = document.getElementById('validationProgress');
    if (progressDiv) progressDiv.style.display = 'none';
    document.getElementById('googleDocsWarning').style.display = 'none';
    
    // Reset character counters
    document.getElementById('charCount').textContent = '0';
    document.getElementById('textCharCount').textContent = '0';
    
    // Reset validation stages
    for (let i = 1; i <= 4; i++) {
        const stage = document.getElementById('stage' + i);
        if (stage) {
            stage.className = 'stage';
            stage.querySelector('.stage-status').innerHTML = '<i class="fas fa-clock"></i>';
        }
    }
    
    // Reset field validations
    document.querySelectorAll('.field-validation').forEach(div => {
        div.innerHTML = '';
        div.className = 'field-validation';
    });
    
    // Set default values
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('deadlineDate').valueAsDate = tomorrow;
    document.getElementById('deadlineTime').value = '17:00';
    document.getElementById('timestamp').value = new Date().toISOString();
    
    // Update UI
    submitBtn.disabled = true;
    if (typeof updateValidationSummary === 'function') {
        updateValidationSummary();
    }
    showNotification('Form telah direset', 'info');
}

/**
 * Redirect to SPS page
 */
function redirectToSPS() {
    // Replace with your actual SPS page URL
    window.location.href = 'https://your-sps-page.com/manual-add.html';
}

// Export functions for global use
window.resetForm = resetForm;