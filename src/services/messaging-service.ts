
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
 * Get all users an admin should be able to chat with (other admins, relevant donors, relevant volunteers)
 */
export const getAdminChatUsers = async (adminId: string) => {
  try {
ld recieve a     // ... (existing logic unchanged)
    // [see previous code block for full function]
  } catch (error) {
    console.error("Error getting admin chat users:", error);
    throw error;
  }
};

/**
 * Get all users a volunteer should be able to chat with (other volunteers, admins of orphanages they work at, and existing conversations)
 */
export const getVolunteerChatUsers = async (volunteerId: string) => {
  try {
    // 1. All other volunteers (excluding self)
    const volunteersQ = query(collection(db, "users"), where("role", "==", "volunteer"));
    const volunteersSnap = await getDocs(volunteersQ);
    const otherVolunteers = volunteersSnap.docs
      .filter(doc => doc.id !== volunteerId)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Admins of orphanages where this volunteer is working (via tasks)
    const tasksQ = query(collection(db, "tasks"), where("volunteers", ">", []));
    const tasksSnap = await getDocs(tasksQ);
    // Find orphanageIds where this volunteer is listed
    const orphanageIds = Array.from(new Set(
      tasksSnap.docs
        .filter(doc => (doc.data().volunteers || []).some((v: any) => v.id === volunteerId))
        .map(doc => doc.data().orphanageId)
    ));
    // Fetch orphanages and their admins
    const admins: any[] = [];
    for (const orphanageId of orphanageIds) {
      const orphanageDoc = await getDoc(doc(db, "orphanages", orphanageId));
      if (orphanageDoc.exists()) {
        const orphanageData = orphanageDoc.data();
        const adminId = orphanageData.adminId;
        if (adminId && adminId !== volunteerId) {
          const adminDoc = await getDoc(doc(db, "users", adminId));
          if (adminDoc.exists() && adminDoc.data().role === "admin") {
            admins.push({ id: adminDoc.id, ...adminDoc.data() });
          }
        }
      }
    }

    // 3. Users from existing conversations
    const conversationsQ = query(collection(db, "conversations"), where("participants", "array-contains", volunteerId));
    const conversationsSnap = await getDocs(conversationsQ);
    const userIdsFromConvos = Array.from(new Set(
      conversationsSnap.docs
        .map(doc => doc.data().participants)
        .flat()
        .filter((uid: string) => uid !== volunteerId)
    ));
    const usersFromConvos: any[] = [];
    for (const userId of userIdsFromConvos) {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        usersFromConvos.push({ id: userDoc.id, ...userDoc.data() });
      }
    }

    // 4. Return unique list
    const allUsers = [
      ...otherVolunteers,
      ...admins,
      ...usersFromConvos
    ];
    const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());
    return uniqueUsers;
  } catch (error) {
    console.error("Error getting volunteer chat users:", error);
    throw error;
  }
};

/**
 * Get all users a donor should be able to chat with (other donors, admins of orphanages they sponsor/donate to/contact, and existing conversations)
 */
export const getDonorChatUsers = async (donorId: string) => {
  try {
    // 1. All other donors (excluding self)
    const donorsQ = query(collection(db, "users"), where("role", "==", "donor"));
    const donorsSnap = await getDocs(donorsQ);
    const otherDonors = donorsSnap.docs
      .filter(doc => doc.id !== donorId)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Admins of orphanages they sponsor or donate to
    // a. Orphanages from sponsorships
    const sponsorshipsQ = query(collection(db, "sponsorships"), where("donorId", "==", donorId));
    const sponsorshipsSnap = await getDocs(sponsorshipsQ);
    const orphanageIdsFromSponsorships = Array.from(new Set(sponsorshipsSnap.docs.map(doc => doc.data().orphanageId)));
    // b. Orphanages from payments
    const paymentsQ = query(collection(db, "payments"), where("donorId", "==", donorId));
    const paymentsSnap = await getDocs(paymentsQ);
    const orphanageIdsFromPayments = Array.from(new Set(paymentsSnap.docs.map(doc => doc.data().orphanageId)));
    // c. Orphanages from conversations
    const conversationsQ = query(collection(db, "conversations"), where("participants", "array-contains", donorId));
    const conversationsSnap = await getDocs(conversationsQ);
    const orphanageAdminIdsFromConvos = Array.from(new Set(
      conversationsSnap.docs
        .map(doc => doc.data().participants)
        .flat()
        .filter((uid: string) => uid !== donorId)
    ));
    // d. Combine all orphanage IDs
    const allOrphanageIds = Array.from(new Set([
      ...orphanageIdsFromSponsorships,
      ...orphanageIdsFromPayments
    ]));
    // e. Fetch orphanage admins
    const admins: any[] = [];
    for (const orphanageId of allOrphanageIds) {
      const orphanageDoc = await getDoc(doc(db, "orphanages", orphanageId));
      if (orphanageDoc.exists()) {
        const orphanageData = orphanageDoc.data();
        const adminId = orphanageData.adminId;
        if (adminId && adminId !== donorId) {
          const adminDoc = await getDoc(doc(db, "users", adminId));
          if (adminDoc.exists() && adminDoc.data().role === "admin") {
            admins.push({ id: adminDoc.id, ...adminDoc.data() });
          }
        }
      }
    }
    // f. Also add admins from conversations (if not already included)
    for (const userId of orphanageAdminIdsFromConvos) {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        admins.push({ id: userDoc.id, ...userDoc.data() });
      }
    }

    // 3. Users from existing conversations (other donors)
    const donorIdsFromConvos = Array.from(new Set(
      conversationsSnap.docs
        .map(doc => doc.data().participants)
        .flat()
        .filter((uid: string) => uid !== donorId)
    ));
    const donorsFromConvos: any[] = [];
    for (const userId of donorIdsFromConvos) {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists() && userDoc.data().role === "donor") {
        donorsFromConvos.push({ id: userDoc.id, ...userDoc.data() });
      }
    }

    // 4. Return unique list
    const allUsers = [
      ...otherDonors,
      ...admins,
      ...donorsFromConvos
    ];
    const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());
    return uniqueUsers;
  } catch (error) {
    console.error("Error getting donor chat users:", error);
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


