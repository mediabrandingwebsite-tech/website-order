// Image Handling Functions

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total for all images
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILES = 10; // Maximum number of files

/**
 * Convert image file to Base64
 */
export async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        // Validate file
        if (!ALLOWED_TYPES.includes(file.type)) {
            reject(new Error('Hanya file PNG, JPG, JPEG, atau WebP yang diizinkan'));
            return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error(`Ukuran file maksimal ${formatFileSize(MAX_FILE_SIZE)}`));
            return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Compress image before Base64 conversion
 */
export async function compressImage(file, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            reject(new Error('Tipe file tidak didukung'));
            return;
        }
        
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions (max 1600px on the longest side)
            let width = img.width;
            let height = img.height;
            const maxDimension = 1600;
            
            if (width > height && width > maxDimension) {
                height = (height * maxDimension) / width;
                width = maxDimension;
            } else if (height > width && height > maxDimension) {
                width = (width * maxDimension) / height;
                height = maxDimension;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                blob => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                },
                file.type,
                quality
            );
            
            // Clean up
            URL.revokeObjectURL(img.src);
        };
        
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
    });
}

/**
 * Validate multiple image files
 */
export function validateImageFiles(files) {
    const errors = [];
    const validFiles = [];
    let totalSize = 0;
    
    if (!files || files.length === 0) {
        errors.push('Tidak ada file yang dipilih');
        return { valid: false, errors, files: [] };
    }
    
    if (files.length > MAX_FILES) {
        errors.push(`Maksimal ${MAX_FILES} file yang dapat diupload`);
        return { valid: false, errors, files: [] };
    }
    
    for (const file of files) {
        // Check file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Format file harus PNG, JPG, JPEG, atau WebP`);
            continue;
        }
        
        // Check individual file size
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name}: Ukuran file maksimal ${formatFileSize(MAX_FILE_SIZE)}`);
            continue;
        }
        
        // Check total size
        totalSize += file.size;
        if (totalSize > MAX_TOTAL_SIZE) {
            errors.push(`Total ukuran semua file maksimal ${formatFileSize(MAX_TOTAL_SIZE)}`);
            break;
        }
        
        validFiles.push(file);
    }
    
    return {
        valid: errors.length === 0 && validFiles.length > 0,
        errors: errors,
        files: validFiles,
        totalFiles: validFiles.length,
        totalSize: totalSize
    };
}

/**
 * Process multiple image files
 */
export async function processMultipleImages(files) {
    const validation = validateImageFiles(files);
    
    if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
    }
    
    const processedImages = [];
    
    for (const file of validation.files) {
        try {
            let processedImage;
            
            if (file.size > 5 * 1024 * 1024) { // Compress files larger than 5MB
                processedImage = await compressImage(file, 0.7);
            } else {
                processedImage = await imageToBase64(file);
            }
            
            processedImages.push({
                name: file.name,
                size: file.size,
                type: file.type,
                data: processedImage,
                compressed: file.size > 5 * 1024 * 1024
            });
            
        } catch (error) {
            console.error(`Error processing image ${file.name}:`, error);
            throw new Error(`Gagal memproses gambar ${file.name}: ${error.message}`);
        }
    }
    
    return processedImages;
}

/**
 * Format file size (helper)
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export for global use
window.imageToBase64 = imageToBase64;
window.compressImage = compressImage;
window.validateImageFiles = validateImageFiles;
window.processMultipleImages = processMultipleImages;
window.formatFileSize = formatFileSize;