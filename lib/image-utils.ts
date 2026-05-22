/**
 * Image utilities for Mbalit.
 *
 * Mbalit deliberately uses ONLY Firestore + Realtime Database from Firebase.
 * Images (profile, orders, hazard reports) are stored as compressed base64
 * data URLs inside their owning Firestore document — Cloud Storage is NOT
 * used. Use `compressImage` aggressively to keep documents under Firestore's
 * 1MB-per-document limit.
 */

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
