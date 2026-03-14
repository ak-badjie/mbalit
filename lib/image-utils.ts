/**
 * Image utilities for Mbalit
 * Compress images and upload to Firebase Storage instead of storing base64 in Firestore
 */
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Compresses a base64 image string by resizing it and reducing quality using HTML5 Canvas.
 */
export const compressImage = (base64: string, maxWidth = 500, maxHeight = 500, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Maintain aspect ratio while limiting dimensions
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64); // Fallback to original if canvas fails
                return;
            }

            // Fill with white background (useful for transparent PNGs converted to JPEG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with reduced quality
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64); // Fallback on error
    });
};

/**
 * Upload a base64 image to Firebase Storage and return the download URL.
 * Compresses the image first, then uploads to the specified path.
 * 
 * @param base64 - The base64 image data (with or without data: prefix)
 * @param storagePath - The path in Firebase Storage (e.g., 'profileImages/userId.jpg')
 * @returns The public download URL for the uploaded image
 */
export const uploadImageToStorage = async (
    base64: string,
    storagePath: string
): Promise<string> => {
    // Compress first
    const compressed = await compressImage(base64);
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    
    // uploadString handles data URLs directly
    await uploadString(storageRef, compressed, 'data_url');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};

/**
 * Upload a profile image for a user or collector.
 * Convenience wrapper around uploadImageToStorage.
 */
export const uploadProfileImage = async (
    userId: string,
    base64: string
): Promise<string> => {
    const path = `profileImages/${userId}_${Date.now()}.jpg`;
    return uploadImageToStorage(base64, path);
};

/**
 * Upload a waste/order image.
 * Convenience wrapper around uploadImageToStorage.
 */
export const uploadOrderImage = async (
    orderId: string,
    base64: string,
    index: number = 0
): Promise<string> => {
    const path = `orderImages/${orderId}_${index}_${Date.now()}.jpg`;
    return uploadImageToStorage(base64, path);
};
