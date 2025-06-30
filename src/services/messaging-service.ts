
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Conversation, Message } from "@/types/models";
import { createNotification } from "./notification-service";

export const getConversations = async (userId: string) => {
  try {
    const conversationsCollection = collection(db, "conversations");
    const q = query(
      conversationsCollection, 
      where("participants", "array-contains", userId),
      orderBy("lastMessage.timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
  } catch (error) {
    console.error("Error getting conversations:", error);
    throw error;
  }
};

export const getMessages = async (conversationId: string) => {
  try {
    const messagesCollection = collection(db, "messages");
    const q = query(
      messagesCollection, 
      where("conversationId", "==", conversationId),
      orderBy("timestamp")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<string> => {
  try {
    const messageData = {
      conversationId,
      senderId,
      text,
      timestamp: Date.now(),
      read: false
    };
    
    const messagesCollection = collection(db, "messages");
    const docRef = await addDoc(messagesCollection, messageData);
    
    // Update conversation with last message
    const conversationRef = doc(db, "conversations", conversationId);
    await updateDoc(conversationRef, {
      lastMessage: {
        text,
        senderId,
        timestamp: new Date()
      },
      lastMessageTime: serverTimestamp()
    });
    
    // Get sender name
    const senderDoc = await getDoc(doc(db, "users", senderId));
    const senderName = senderDoc.data()?.displayName || "Someone";
    
    // Create notification for receiver
    await createNotification(
      receiverId,
      "New Message",
      `${senderName}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
      "message",
      conversationId
    );
    
    return docRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const markMessagesAsRead = async (conversationId: string, userId: string) => {
  try {
    const messagesCollection = collection(db, "messages");
    const q = query(
      messagesCollection, 
      where("conversationId", "==", conversationId),
      where("senderId", "!=", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    
    // Batch update all unread messages
    const batch = snapshot.docs;
    for (const doc of batch) {
      await updateDoc(doc.ref, { read: true });
    }
    
    return batch.length; // Number of messages marked as read
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

/**
 * Create a new conversation between users
 */
export const createConversation = async (
  userId1: string,
  userId2: string
): Promise<string> => {
  try {
    // Check if users can communicate based on roles
    const user1Doc = await getDoc(doc(db, "users", userId1));
    const user2Doc = await getDoc(doc(db, "users", userId2));
    
    const user1Data = user1Doc.data();
    const user2Data = user2Doc.data();
    
    // Validate that these users should be able to chat
    let canCommunicate = false;
    
    // Admin can chat with anyone
    if (user1Data?.role === "admin" || user2Data?.role === "admin") {
      // If one is admin, check if they're from the same orphanage
      if (user1Data?.orphanageId === user2Data?.orphanageId) {
        canCommunicate = true;
      } else if (user1Data?.role === "donor" || user2Data?.role === "donor") {
        // Check if donor is sponsoring this orphanage
        const donorId = user1Data?.role === "donor" ? userId1 : userId2;
        const orphanageId = user1Data?.role === "admin" ? user1Data.orphanageId : user2Data?.orphanageId;
        
        const sponsorshipsQuery = query(
          collection(db, "sponsorships"),
          where("donorId", "==", donorId),
          where("orphanageId", "==", orphanageId),
          where("status", "==", "active")
        );
        
        const sponsorshipsSnapshot = await getDocs(sponsorshipsQuery);
        canCommunicate = !sponsorshipsSnapshot.empty;
      }
    }
    
    if (!canCommunicate) {
      throw new Error("These users cannot communicate with each other");
    }
    
    // Check if conversation already exists
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId1)
    );
    
    const conversationsSnapshot = await getDocs(conversationsQuery);
    let existingConversation = null;
    
    conversationsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(userId2)) {
        existingConversation = doc;
      }
    });
    
    if (existingConversation) {
      return existingConversation.id;
    }
    
    // Create new conversation
    const conversationRef = await addDoc(collection(db, "conversations"), {
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
      lastMessageTime: serverTimestamp()
    });
    
    return conversationRef.id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};


