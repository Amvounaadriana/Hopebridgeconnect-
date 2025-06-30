/**
 * Utility functions for handling files in the application
 */

/**
 * Converts a File object to a base64 string
 * @param file The file to convert
 * @returns A Promise that resolves to the base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Compresses an image file to reduce its size
 * @param file The image file to compress
 * @param maxWidth Maximum width of the compressed image
 * @param quality Compression quality (0-1)
 * @returns A Promise that resolves to a compressed base64 string
 */
export const compressImage = (
  file: File, 
  maxWidth = 800, 
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Get compressed base64 string
        const compressedBase64 = canvas.toDataURL(file.type, quality);
        resolve(compressedBase64);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
  });
};