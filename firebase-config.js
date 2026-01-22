// Firebase Configuration
// Your Firebase Config - REPLACE WITH YOUR VALUES
const firebaseConfig = {
  apiKey: "AIzaSyAicfAJIR2mOH8fAOam66WxU-9ZvXdpykU",
  authDomain: "order-media-himsi.firebaseapp.com",
  projectId: "order-media-himsi",
  storageBucket: "order-media-himsi.firebasestorage.app",
  messagingSenderId: "676603759842",
  appId: "1:676603759842:web:e965923a04e135756222bb",
  measurementId: "G-F90BRJ6HQV"
};

// Initialize Firebase
let db = null;
let app = null;

try {
  if (firebase && firebase.initializeApp) {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(app);
  }
} catch (error) {
  console.warn('Firebase initialization failed:', error);
}

// Firestore collections
const ORDERS_COLLECTION = "orders";

/**
 * Submit order to Firestore
 */
export async function submitOrder(orderData) {
    try {
        // If Firebase is not available, use mock
        if (!db) {
            console.warn('Firebase not available, using mock submission');
            return {
                success: true,
                orderId: generateOrderId(),
                docId: 'mock-' + Date.now(),
                message: 'Order berhasil disimpan (mock)'
            };
        }
        
        // Prepare data for Firestore
        const firestoreData = {
            // Order Information
            bidang: orderData.bidang,
            bidangText: orderData.bidangText,
            tipeOrder: orderData.tipeOrder,
            ukuran: orderData.ukuran,
            
            // Images (store as array of base64 strings or file metadata)
            referenceImages: orderData.referenceImages || [],
            imageCount: orderData.referenceImages ? orderData.referenceImages.length : 0,
            
            // Content
            konten: orderData.konten,
            caption: orderData.caption,
            
            // Deadline
            deadline: orderData.deadline,
            
            // Contact (email removed)
            contact: orderData.contact,
            
            // Metadata
            createdAt: orderData.createdAt,
            status: orderData.status,
            ipAddress: orderData.ipAddress,
            userAgent: orderData.userAgent,
            
            // System fields
            submittedAt: new Date().toISOString(),
            orderId: generateOrderId(),
            progress: 'pending',
            assignedTo: null,
            notes: []
        };
        
        // Add to Firestore
        const docRef = await db.collection('orders').add(firestoreData);
        
        return {
            success: true,
            orderId: firestoreData.orderId,
            docId: docRef.id,
            message: 'Order berhasil disimpan'
        };
        
    } catch (error) {
        console.error('Error submitting order:', error);
        return {
            success: false,
            error: error.message,
            message: 'Gagal menyimpan order'
        };
    }
}

/**
 * Generate order ID (matching the one in utils.js)
 */
function generateOrderId() {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Export for use in other files
window.submitOrder = submitOrder;
window.firebaseApp = app;
window.firebaseDb = db;