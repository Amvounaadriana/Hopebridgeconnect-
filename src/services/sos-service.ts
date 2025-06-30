
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SOSAlert } from "@/types/models";
import { createNotification } from "./notification-service";

export const createSOSAlert = async (
  userId: string,
  userName: string,
  userType: "volunteer" | "child",
  userPhoto: string | null,
  location: { lat: number; lng: number; address: string },
  message: string | null = null,
  phoneNumber: string
): Promise<string> => {
  try {
    const alertData: Omit<SOSAlert, "id"> = {
      userId,
      userName,
      userType,
      userPhoto,
      timestamp: Date.now(),
      location,
      message,
      status: "active",
      phoneNumber
    };
    
    const alertsCollection = collection(db, "sosAlerts");
    const docRef = await addDoc(alertsCollection, alertData);
    
    // Create notifications for admins
    const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const adminsSnapshot = await getDocs(adminsQuery);
    
    adminsSnapshot.forEach(async (adminDoc) => {
      await createNotification(
        adminDoc.id,
        "Emergency SOS Alert",
        `${userName} has sent an emergency SOS alert`,
        "sos",
        docRef.id
      );
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating SOS alert:", error);
    throw error;
  }
};

export const getSOSAlertsByStatus = async (status?: "active" | "in-progress" | "resolved" | "false-alarm"): Promise<SOSAlert[]> => {
  try {
    const alertsCollection = collection(db, "sosAlerts");
    
    let q;
    if (status) {
      q = query(
        alertsCollection,
        where("status", "==", status),
        orderBy("timestamp", "desc")
      );
    } else {
      q = query(alertsCollection, orderBy("timestamp", "desc"));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      // Cast data to DocumentData to ensure TypeScript recognizes it as a valid object
      const data = doc.data() as DocumentData;
      
      // Create a properly typed SOSAlert object with explicit type assertions
      return {
        id: doc.id,
        userId: data.userId as string,
        userName: data.userName as string,
        userType: data.userType as "volunteer" | "child", 
        userPhoto: data.userPhoto as string | null,
        timestamp: data.timestamp as number,
        location: data.location as { lat: number; lng: number; address: string },
        message: data.message as string | null,
        status: data.status as "active" | "in-progress" | "resolved" | "false-alarm",
        phoneNumber: data.phoneNumber as string
      };
    });
  } catch (error) {
    console.error("Error fetching SOS alerts:", error);
    throw error;
  }
};

export const updateSOSAlertStatus = async (
  alertId: string,
  status: "active" | "in-progress" | "resolved" | "false-alarm"
): Promise<void> => {
  try {
    const alertRef = doc(db, "sosAlerts", alertId);
    await updateDoc(alertRef, { 
      status,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error updating SOS alert status:", error);
    throw error;
  }
};

