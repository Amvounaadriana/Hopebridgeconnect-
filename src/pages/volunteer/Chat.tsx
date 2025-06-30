import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { SendHorizontal, MessageSquare, Phone, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Types
interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  createdAt?: any;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  read: boolean;
}

interface AdminUser {
  id: string;
  displayName: string;
  orphanage?: string;
  photoURL?: string | null;
  email?: string;
}

const VolunteerChat = () => {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [startingConversation, setStartingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add this function to fetch only relevant orphanage admins
  const fetchRelevantAdmins = async () => {
    if (!currentUser?.uid) return;
    try {
      // Get the volunteer's profile to find assigned orphanages
      const volunteerDoc = await getDoc(doc(db, "users", currentUser.uid));
      const volunteerData = volunteerDoc.data();
      let orphanageIds: string[] = [];
      if (Array.isArray(volunteerData?.orphanageIds)) {
        orphanageIds = volunteerData.orphanageIds;
      } else if (volunteerData?.orphanageId) {
        orphanageIds = [volunteerData.orphanageId];
      }
      if (!orphanageIds.length) {
        setAdmins([]);
        return;
      }
      // Get admins for all orphanages
      let adminsList: AdminUser[] = [];
      // Firestore 'in' queries limited to 10
      for (let i = 0; i < orphanageIds.length; i += 10) {
        const batch = orphanageIds.slice(i, i + 10);
        const adminsQuery = query(
          collection(db, "users"),
          where("role", "==", "admin"),
          where("orphanageId", "in", batch)
        );
        const adminsSnapshot = await getDocs(adminsQuery);
        adminsList = adminsList.concat(
          adminsSnapshot.docs.map(doc => ({
            id: doc.id,
            displayName: doc.data().displayName || "Admin",
            orphanage: doc.data().orphanageName,
            photoURL: doc.data().photoURL,
            email: doc.data().email
          }))
        );
      }
      setAdmins(adminsList);
      // Check for existing conversations with these admins
      const conversationsQuery = query(
        collection(db, "conversations"),
        where("participants", "array-contains", currentUser.uid)
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);
      const conversationsList: Conversation[] = [];
      conversationsSnapshot.forEach(doc => {
        const data = doc.data();
        const adminParticipant = data.participants.find(
          (id: string) => id !== currentUser.uid && adminsList.some(admin => admin.id === id)
        );
        if (adminParticipant) {
          conversationsList.push({
            id: doc.id,
            participants: data.participants,
            lastMessage: data.lastMessage,
            createdAt: data.createdAt
          });
        }
      });
      setConversations(conversationsList);
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  };

  // Fetch conversations for current user
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);

    // Listen for real-time updates
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        convs.push({
          id: docSnap.id,
          participants: data.participants || [],
          lastMessage: data.lastMessage
            ? {
                text: data.lastMessage.text || "",
                senderId: data.lastMessage.senderId || "",
                timestamp: data.lastMessage.timestamp?.toMillis
                  ? data.lastMessage.timestamp.toMillis()
                  : typeof data.lastMessage.timestamp === "number"
                  ? data.lastMessage.timestamp
                  : Date.now(),
              }
            : undefined,
          createdAt: data.createdAt,
        });
      });
      // Sort by last message timestamp desc
      convs.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || 0;
        const bTime = b.lastMessage?.timestamp || 0;
        return bTime - aTime;
      });
      setConversations(convs);
      setLoading(false);
      // Auto-select first conversation if none selected
      if (!activeConversation && convs.length > 0) {
        setActiveConversation(convs[0].id);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line
  }, [currentUser?.uid]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "conversations", activeConversation, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        msgs.push({
          id: docSnap.id,
          text: d.text,
          senderId: d.senderId,
          receiverId: d.receiverId,
          timestamp: d.timestamp?.toMillis
            ? d.timestamp.toMillis()
            : typeof d.timestamp === "number"
            ? d.timestamp
            : Date.now(),
          read: d.read ?? false,
        });
      });
      setMessages(msgs);
      scrollToBottom();
      // Mark as read
      markMessagesAsRead(activeConversation);
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark all messages as read for current user
  const markMessagesAsRead = async (conversationId: string) => {
    if (!currentUser?.uid) return;
    try {
      const msgsRef = collection(db, "conversations", conversationId, "messages");
      const q = query(msgsRef, where("receiverId", "==", currentUser.uid), where("read", "==", false));
      const unreadSnapshot = await getDocs(q);
      const batchPromises: Promise<any>[] = [];
      unreadSnapshot.forEach((docSnap) => {
        batchPromises.push(updateDoc(docSnap.ref, { read: true }));
      });
      await Promise.all(batchPromises);
    } catch (err) {
      // Silent fail
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser?.uid || !activeConversation) return;
    try {
      // Find admin participant
      const conversation = conversations.find((c) => c.id === activeConversation);
      const adminId = conversation?.participants.find((id) => id !== currentUser.uid);
      if (!adminId) return;

      const messagesRef = collection(db, "conversations", activeConversation, "messages");
      const newMsg = {
        text: messageText.trim(),
        senderId: currentUser.uid,
        receiverId: adminId,
        timestamp: serverTimestamp(),
        read: false,
      };
      await addDoc(messagesRef, newMsg);

      // Update lastMessage in conversation
      await updateDoc(doc(db, "conversations", activeConversation), {
        lastMessage: {
          text: messageText.trim(),
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
        },
      });

      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send your message",
        variant: "destructive",
      });
    }
  };

  // Start a new conversation with an admin
  const handleStartConversation = async (adminId: string) => {
    if (!currentUser?.uid) return;
    setStartingConversation(true);
    try {
      // Check if conversation already exists
      const q = query(
        collection(db, "conversations"),
        where("participants", "in", [
          [currentUser.uid, adminId],
          [adminId, currentUser.uid],
        ])
      );
      const snapshot = await getDocs(q);
      let conversationId: string | null = null;
      snapshot.forEach((docSnap) => {
        conversationId = docSnap.id;
      });

      if (!conversationId) {
        // Create new conversation
        const docRef = await addDoc(collection(db, "conversations"), {
          participants: [currentUser.uid, adminId],
          createdAt: serverTimestamp(),
          lastMessage: null,
        });
        conversationId = docRef.id;
      }
      setActiveConversation(conversationId);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    } finally {
      setStartingConversation(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get admin info for a conversation
  const getAdminInfo = (conversation: Conversation | undefined): AdminUser | null => {
    if (!conversation || !currentUser?.uid) return null;
    const adminId = conversation.participants.find((id) => id !== currentUser.uid);
    if (!adminId) return null;
    return admins.find((a) => a.id === adminId) || {
      id: adminId,
      displayName: "Orphanage Admin",
      orphanage: "",
      photoURL: null,
    };
  };

  const formatMessageTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // For the selected conversation
  const selectedConversation = conversations.find((c) => c.id === activeConversation);
  const selectedAdmin = getAdminInfo(selectedConversation);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Conversation List */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No conversations yet</p>
                <div className="mt-4 space-y-2">
                  {admins.length === 0 ? (
                    <span className="text-muted-foreground text-sm">No orphanage admins found.</span>
                  ) : (
                    admins.map((admin) => (
                      <Button
                        key={admin.id}
                        variant="outline"
                        className="w-full"
                        disabled={startingConversation}
                        onClick={() => handleStartConversation(admin.id)}
                      >
                        <Avatar className="mr-2 h-6 w-6">
                          <AvatarImage src={admin.photoURL || undefined} />
                          <AvatarFallback>{getInitials(admin.displayName)}</AvatarFallback>
                        </Avatar>
                        Message {admin.displayName}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const adminInfo = getAdminInfo(conversation);
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => setActiveConversation(conversation.id)}
                      className={`flex items-center space-x-4 p-3 rounded-md cursor-pointer hover:bg-gray-100 ${
                        activeConversation === conversation.id ? "bg-gray-100" : ""
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={adminInfo?.photoURL || undefined} />
                        <AvatarFallback>{getInitials(adminInfo?.displayName || "A")}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate flex items-center gap-2">
                          {adminInfo?.displayName}
                          {adminInfo?.orphanage && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {adminInfo.orphanage}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage?.text || "No messages yet"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {conversation.lastMessage?.timestamp
                          ? formatMessageTime(conversation.lastMessage.timestamp)
                          : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message View */}
        <Card className="md:col-span-2 flex flex-col">
          {activeConversation && selectedAdmin ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={selectedAdmin.photoURL || undefined} />
                    <AvatarFallback>{getInitials(selectedAdmin.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle>{selectedAdmin.displayName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedAdmin.orphanage}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = message.senderId === currentUser?.uid;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          isCurrentUser
                            ? "bg-hope-500 text-white rounded-br-none"
                            : "bg-gray-100 rounded-bl-none"
                        }`}
                      >
                        <p className="break-words">{message.text}</p>
                        <div
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-white/80" : "text-gray-500"
                          }`}
                        >
                          {formatMessageTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />

                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare className="h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-lg font-medium">No messages yet</p>
                    <p className="text-muted-foreground max-w-xs mt-1">
                      Send a message to start the conversation with the orphanage administrator
                    </p>
                  </div>
                )}
              </CardContent>

              <div className="p-4 border-t">
                <form
                  className="flex items-center space-x-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <Input
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!messageText.trim()}>
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium">No Conversation Selected</h3>
              <p className="text-muted-foreground mt-2">
                Please select a conversation or start a new one with an orphanage admin.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VolunteerChat;

