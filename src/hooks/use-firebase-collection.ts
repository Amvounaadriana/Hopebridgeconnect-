
import { useState, useEffect } from 'react';
import { 
  collection, 
  query,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  QueryConstraint,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot,
  QueryDocumentSnapshot,
  QueryCompositeFilterConstraint,
  FieldPath,
  WhereFilterOp,
  orderBy as fbOrderBy,
  where as fbWhere,
  limit as fbLimit,
  startAfter as fbStartAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseCollectionOptions {
  collectionName: string;
  where?: [string | FieldPath, WhereFilterOp, unknown][];
  orderBy?: [string, 'asc' | 'desc'][];
  limit?: number;
}

interface UseCollectionReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addDocument: (data: Partial<T>) => Promise<string>;
  updateDocument: (id: string, data: Partial<T>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  getDocument: (id: string) => Promise<T | null>;
}

export function useCollection<T extends DocumentData>({
  collectionName,
  where,
  orderBy,
  limit,
}: UseCollectionOptions): UseCollectionReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const collectionRef = collection(db, collectionName);
      const constraints: QueryConstraint[] = [];

      if (where) {
        where.forEach(([field, operator, value]) => {
          constraints.push(fbWhere(field, operator, value));
        });
      }

      if (orderBy) {
        orderBy.forEach(([field, direction]) => {
          constraints.push(fbOrderBy(field, direction));
        });
      }

      if (limit) {
        constraints.push(fbLimit(limit));
      }

      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);

      const documents = querySnapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() } as unknown as T;
      });

      setData(documents);
    } catch (err) {
      console.error('Error fetching collection:', err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [collectionName, JSON.stringify(where), JSON.stringify(orderBy), limit]);

  const refresh = async () => {
    await fetchData();
  };

  const addDocument = async (data: Partial<T>): Promise<string> => {
    try {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date().toISOString(),
      });
      await refresh();
      return docRef.id;
    } catch (err) {
      console.error('Error adding document:', err);
      throw err instanceof Error ? err : new Error('An unknown error occurred');
    }
  };

  const getDocument = async (id: string): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as unknown as T;
      } else {
        return null;
      }
    } catch (err) {
      console.error('Error getting document:', err);
      throw err instanceof Error ? err : new Error('An unknown error occurred');
    }
  };

  const updateDocument = async (id: string, data: Partial<T>): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await refresh();
    } catch (err) {
      console.error('Error updating document:', err);
      throw err instanceof Error ? err : new Error('An unknown error occurred');
    }
  };

  const deleteDocument = async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      await refresh();
    } catch (err) {
      console.error('Error deleting document:', err);
      throw err instanceof Error ? err : new Error('An unknown error occurred');
    }
  };

  return {
    data,
    loading,
    error,
    refresh,
    addDocument,
    updateDocument,
    deleteDocument,
    getDocument,
  };
}
