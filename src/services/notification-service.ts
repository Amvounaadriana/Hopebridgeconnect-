
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, writeBatch, getDoc } from "firebase/firestore";
import { Notification } from "@/types";
import { sendChatNotificationEmail } from "@/services/email";

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: "message" | "donation" | "wish" | "sos" | "volunteer" | "system",
  relatedId?: string
): Promise<string> => {
  try {
    const notificationData: Omit<Notification, "id"> = {
      userId,
      title,
      message,
      type,
      read: false,
      relatedId,
      timestamp: Date.now()
    };
    
    const notificationsCollection = collection(db, "notifications");
    const docRef = await addDoc(notificationsCollection, notificationData);
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, where("userId", "==", userId), where("read", "==", false));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, where("userId", "==", userId), where("read", "==", false));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting unread notifications count:", error);
    throw error;
  }
};

/**
 * Create chat notification and send email if user is offline
 */
export const createChatNotification = async (
  userId: string,
  senderId: string,
  senderName: string,
  message: string,
  conversationId: string
): Promise<void> => {
  try {
    // Create in-app notification
    await createNotification(
      userId,
      "New Message",
      `${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      "message",
      conversationId
    );
    
    // Check if user is online
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    
    // If user has email notifications enabled or is offline, send email
    if (userData?.emailNotifications || userData?.status !== "online") {
      // Get user email
      const userEmail = userData?.email;
      
      if (userEmail) {
        // Send email notification
        await sendChatNotificationEmail(
          userEmail,
          userData.displayName || "User",
          senderName,
          message.substring(0, 100) + (message.length > 100 ? '...' : '')
        );
      }
    }
  } catch (error) {
    console.error("Error creating chat notification:", error);
  }
};


