
import { useState } from "react";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { fileToBase64, compressImage } from "@/utils/file-utils";

export function useFirebaseStorage(collectionPath: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (file: File, customFileName?: string): Promise<string | null> => {
    if (!file) return null;

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);

      // Convert file to base64
      let base64Data;
      
      // If it's an image, compress it first
      if (file.type.startsWith('image/')) {
        base64Data = await compressImage(file);
      } else {
        base64Data = await fileToBase64(file);
      }
      
      // Create a metadata object
      const metadata = {
        name: customFileName || `${Date.now()}_${file.name}`,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        base64Data: base64Data,
        createdAt: Date.now()
      };
      
      // Store in Firestore
      const docRef = await addDoc(collection(db, `${collectionPath}_files`), metadata);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully",
      });
      
      // Return the base64 data directly
      return base64Data;
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string): Promise<boolean> => {
    try {
      // Mark the document as deleted in Firestore
      await updateDoc(doc(db, `${collectionPath}_files`, fileId), {
        deleted: true,
        deletedAt: Date.now()
      });
      
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully",
      });
      
      return true;
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  return { uploadFile, deleteFile, uploading, progress };
}




