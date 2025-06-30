import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { Orphanage, Child, Wish } from "@/types/models";

// Enhanced Orphanage CRUD operations with debugging
export const getOrphanages = async () => {
  try {
    const orphanageCollection = collection(db, "orphanages");
    const snapshot = await getDocs(orphanageCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Orphanage));
  } catch (error) {
    console.error("Error getting orphanages:", error);
    throw error;
  }
};

export const getOrphanageById = async (id: string) => {
  try {
    const docRef = doc(db, "orphanages", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Orphanage;
    } else {
      throw new Error("Orphanage not found");
    }
  } catch (error) {
    console.error("Error getting orphanage:", error);
    throw error;
  }
};

export const getOrphanagesByAdminId = async (adminId: string) => {
  try {
    const orphanageCollection = collection(db, "orphanages");
    const q = query(orphanageCollection, where("adminId", "==", adminId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Orphanage));
  } catch (error) {
    console.error("Error getting orphanages by admin ID:", error);
    throw error;
  }
};

export const createOrphanage = async (orphanageData: Omit<Orphanage, 'id' | 'createdAt'>) => {
  try {
    console.log("Creating orphanage with data:", orphanageData);
    const orphanageCollection = collection(db, "orphanages");
    const newOrphanage = {
      ...orphanageData,
      createdAt: Date.now()
    };
    
    const docRef = await addDoc(orphanageCollection, newOrphanage);
    console.log("Orphanage created with ID:", docRef.id);
    
    // Verify the document was created by fetching it
    const verifyDoc = await getDoc(docRef);
    if (!verifyDoc.exists()) {
      throw new Error("Failed to create orphanage - document not found after creation");
    }
    
    return { id: docRef.id, ...newOrphanage } as Orphanage;
  } catch (error) {
    console.error("Error creating orphanage:", error);
    throw error;
  }
};

export const updateOrphanage = async (orphanageId: string, orphanageData: Partial<Orphanage>) => {
  try {
    const docRef = doc(db, "orphanages", orphanageId);
    await updateDoc(docRef, {
      ...orphanageData,
      updatedAt: Date.now()
    });
    
    // Get the updated document
    const updatedDoc = await getDoc(docRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as Orphanage;
  } catch (error) {
    console.error("Error updating orphanage:", error);
    throw error;
  }
};

export const getChildrenByOrphanage = async (orphanageId: string) => {
  try {
    console.log("Fetching children for orphanage:", orphanageId);
    
    const childrenCollection = collection(db, "children");
    const q = query(childrenCollection, where("orphanageId", "==", orphanageId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No children found for this orphanage");
      return [];
    }
    
    const children = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log("Child data:", doc.id, data);
      return { 
        id: doc.id, 
        ...data,
        // Ensure all required fields are present
        name: data.name || "",
        dob: data.dob || "",
        gender: data.gender || "",
        photo: data.photo || null,
        orphanageId: data.orphanageId || "",
        documents: data.documents || [],
        createdAt: data.createdAt || Date.now()
      };
    });
    
    console.log("Returning children:", children);
    return children as Child[];
  } catch (error) {
    console.error("Error getting children by orphanage:", error);
    throw error;
  }
};

export const getChildById = async (childId: string) => {
  try {
    const docRef = doc(db, "children", childId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Child;
    } else {
      throw new Error("Child not found");
    }
  } catch (error) {
    console.error("Error getting child:", error);
    throw error;
  }
};

export const addChild = async (childData: Omit<Child, 'id' | 'createdAt'>) => {
  try {
    // Validate required fields
    if (!childData.name || !childData.orphanageId) {
      console.error("Missing required fields:", { 
        name: childData.name, 
        orphanageId: childData.orphanageId 
      });
      throw new Error("Missing required fields: name and orphanageId are required");
    }

    console.log("Adding child with data:", childData);
    
    const childrenCollection = collection(db, "children");
    const newChild = {
      ...childData,
      createdAt: Date.now()
    };
    
    const docRef = await addDoc(childrenCollection, newChild);
    
    // Verify the document was created
    const verifyDoc = await getDoc(docRef);
    if (!verifyDoc.exists()) {
      throw new Error("Failed to create child - document not found after creation");
    }
    
    console.log("Child created successfully with ID:", docRef.id);
    return { id: docRef.id, ...newChild } as Child;
  } catch (error) {
    console.error("Error adding child:", error);
    throw error;
  }
};

export const updateChild = async (childId: string, childData: Partial<Child>) => {
  try {
    const docRef = doc(db, "children", childId);
    await updateDoc(docRef, {
      ...childData,
      updatedAt: Date.now()
    });
    
    // Get the updated document
    const updatedDoc = await getDoc(docRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as Child;
  } catch (error) {
    console.error("Error updating child:", error);
    throw error;
  }
};

export const uploadChildPhoto = async (base64Data: string, childId: string) => {
  try {
    // Update the child with the photo data directly
    const childRef = doc(db, "children", childId);
    await updateDoc(childRef, {
      photo: base64Data,
      updatedAt: Date.now()
    });
    
    return base64Data;
  } catch (error) {
    console.error("Error uploading photo:", error);
    throw error;
  }
};

export const getWishesByChild = async (childId: string) => {
  try {
    const wishesCollection = collection(db, "wishes");
    const q = query(wishesCollection, where("childId", "==", childId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wish));
  } catch (error) {
    console.error("Error getting wishes by child:", error);
    throw error;
  }
};

export const getWishesByOrphanage = async (orphanageId: string) => {
  try {
    // First get all children from this orphanage
    const children = await getChildrenByOrphanage(orphanageId);
    
    if (children.length === 0) {
      return [];
    }
    
    // Get all wishes for these children
    const childIds = children.map(child => child.id);
    const wishesCollection = collection(db, "wishes");
    
    // Firebase doesn't support "in" queries directly in compound queries
    // So we need to get all wishes for each child separately
    const wishesPromises = childIds.map(childId => {
      const q = query(wishesCollection, where("childId", "==", childId));
      return getDocs(q);
    });
    
    const wishesSnapshots = await Promise.all(wishesPromises);
    
    // Combine all wishes into a single array
    const wishes: Wish[] = [];
    wishesSnapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        wishes.push({ id: doc.id, ...doc.data() } as Wish);
      });
    });
    
    return wishes;
  } catch (error) {
    console.error("Error getting wishes by orphanage:", error);
    throw error;
  }
};

export const addWish = async (wishData: Omit<Wish, 'id' | 'createdAt'>) => {
  try {
    const wishesCollection = collection(db, "wishes");
    const newWish = {
      ...wishData,
      status: wishData.status || "pending",
      createdAt: Date.now()
    };
    
    const docRef = await addDoc(wishesCollection, newWish);
    return { id: docRef.id, ...newWish } as Wish;
  } catch (error) {
    console.error("Error adding wish:", error);
    throw error;
  }
};

export const updateWishStatus = async (wishId: string, status: Wish['status'], donorId?: string, donorName?: string) => {
  try {
    const docRef = doc(db, "wishes", wishId);
    const updateData: any = {
      status,
      updatedAt: Date.now()
    };
    
    if (donorId && donorName) {
      updateData.donorId = donorId;
      updateData.donorName = donorName;
    }
    
    await updateDoc(docRef, updateData);
    
    // Get the updated document
    const updatedDoc = await getDoc(docRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as Wish;
  } catch (error) {
    console.error("Error updating wish status:", error);
    throw error;
  }
};









