import { useState, useEffect, useRef } from "react";
import { listenToUserPresence } from "@/services/volunteer-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";

interface Contact {
  id: string;
  name: string;
  role: "admin" | "donor";
  orphanageId?: string; // Only for admins
  orphanageName?: string; // Only for admins
  photo: string | null;
  status: "online" | "offline";
  lastMessage: {
    text: string;
    time: string;
    unread: boolean;
  };
  roomId: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isDonor: boolean;
  read: boolean;
}

const DonorChat = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [presenceUnsubs, setPresenceUnsubs] = useState<Record<string, () => void>>({});
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts (orphanage admins where donor has donated)
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    
    const fetchDonorContacts = async () => {
      try {
        // 1. Get all orphanageIds this donor is associated with
        const orphanageIds = new Set<string>();
        // Donations
        const donationsQuery = query(
          collection(db, "donations"),
          where("donorId", "==", currentUser.uid)
        );
        const donationsSnapshot = await getDocs(donationsQuery);
        donationsSnapshot.forEach(doc => {
          const donation = doc.data();
          if (donation.orphanageId) {
            orphanageIds.add(donation.orphanageId);
          }
        });
        // Sponsorships
        const sponsorshipsQuery = query(
          collection(db, "sponsorships"),
          where("donorId", "==", currentUser.uid)
        );
        const sponsorshipsSnapshot = await getDocs(sponsorshipsQuery);
        sponsorshipsSnapshot.forEach(doc => {
          const sponsorship = doc.data();
          if (sponsorship.orphanageId) {
            orphanageIds.add(sponsorship.orphanageId);
          }
        });
        // Payments (NEW: include all orphanages from payments)
        const paymentsQuery = query(
          collection(db, "payments"),
          where("donorId", "==", currentUser.uid)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach(doc => {
          const payment = doc.data();
          if (payment.orphanageId) {
            orphanageIds.add(payment.orphanageId);
          }
        });
        if (orphanageIds.size === 0) {
          setLoading(false);
          return;
        }
        // 2. Fetch orphanage admins
        const adminContactsPromises = Array.from(orphanageIds).map(async (orphanageId) => {
          const orphanageDoc = await getDoc(doc(db, "orphanages", orphanageId));
          if (!orphanageDoc.exists()) return null;
          const orphanageData = orphanageDoc.data();
          const adminsQuery = query(
            collection(db, "users"),
            where("role", "==", "admin"),
            where("orphanageId", "==", orphanageId)
          );
          const adminsSnapshot = await getDocs(adminsQuery);
          if (adminsSnapshot.empty) return null;
          const adminDoc = adminsSnapshot.docs[0];
          const adminData = adminDoc.data();
          // Find or create chat room between donor and admin
          let roomId = "";
          const roomsQuery = query(
            collection(db, "chatRooms"),
            where("participants", "array-contains", currentUser.uid)
          );
          const roomsSnapshot = await getDocs(roomsQuery);
          // Find room with both donor and this admin
          roomsSnapshot.forEach(doc => {
            const roomData = doc.data();
            if (roomData.participants.includes(adminDoc.id)) {
              roomId = doc.id;
            }
          });
          // If no room exists, create one
          if (!roomId) {
            const newRoomRef = await addDoc(collection(db, "chatRooms"), {
              participants: [currentUser.uid, adminDoc.id],
              createdAt: serverTimestamp(),
              lastMessageTime: serverTimestamp()
            });
            roomId = newRoomRef.id;
          }
          // Get last message if any
          let lastMessage = {
            text: "No messages yet",
            time: "",
            unread: false
          };
          const messagesQuery = query(
            collection(db, "messages"),
            where("roomId", "==", roomId),
            orderBy("timestamp", "desc"),
            where("timestamp", "!=", null)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          if (!messagesSnapshot.empty) {
            const lastMessageData = messagesSnapshot.docs[0].data();
            lastMessage = {
              text: lastMessageData.text || "No message content",
              time: lastMessageData.timestamp ? 
                format(new Date(lastMessageData.timestamp.toDate()), "h:mm a") : "",
              unread: lastMessageData.senderId !== currentUser.uid && 
                     (!lastMessageData.readBy || !lastMessageData.readBy.includes(currentUser.uid))
            };
          }
          return {
            id: adminDoc.id,
            name: adminData.name || "Orphanage Admin",
            role: "admin" as const,
            orphanageId: orphanageId,
            orphanageName: orphanageData.name || "Orphanage",
            photo: adminData.photoURL || null,
            status: adminData.status || "offline",
            lastMessage,
            roomId
          };
        });
        // 3. Fetch other donors for these orphanages (excluding current donor)
        let donorContacts: Contact[] = [];
        for (const orphanageId of orphanageIds) {
          // Get all donors who donated to this orphanage
          const donorsQuery = query(
            collection(db, "donations"),
            where("orphanageId", "==", orphanageId)
          );
          const donorsSnapshot = await getDocs(donorsQuery);
          const donorIds = new Set<string>();
          donorsSnapshot.forEach(doc => {
            const donation = doc.data();
            if (donation.donorId && donation.donorId !== currentUser.uid) {
              donorIds.add(donation.donorId);
            }
          });
          // Also add donors from sponsorships
          const sponsorDonorsQuery = query(
            collection(db, "sponsorships"),
            where("orphanageId", "==", orphanageId)
          );
          const sponsorDonorsSnapshot = await getDocs(sponsorDonorsQuery);
          sponsorDonorsSnapshot.forEach(doc => {
            const sponsorship = doc.data();
            if (sponsorship.donorId && sponsorship.donorId !== currentUser.uid) {
              donorIds.add(sponsorship.donorId);
            }
          });
          // Fetch donor user profiles
          if (donorIds.size > 0) {
            // Firestore 'in' queries limited to 10
            const donorIdArr = Array.from(donorIds);
            for (let i = 0; i < donorIdArr.length; i += 10) {
              const batch = donorIdArr.slice(i, i + 10);
              const usersQuery = query(
                collection(db, "users"),
                where("uid", "in", batch)
              );
              const usersSnapshot = await getDocs(usersQuery);
              for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                // Find or create chat room between donor and this donor
                let roomId = "";
                const roomsQuery = query(
                  collection(db, "chatRooms"),
                  where("participants", "array-contains", currentUser.uid)
                );
                const roomsSnapshot = await getDocs(roomsQuery);
                roomsSnapshot.forEach(doc => {
                  const roomData = doc.data();
                  if (roomData.participants.includes(userDoc.id)) {
                    roomId = doc.id;
                  }
                });
                if (!roomId) {
                  const newRoomRef = await addDoc(collection(db, "chatRooms"), {
                    participants: [currentUser.uid, userDoc.id],
                    createdAt: serverTimestamp(),
                    lastMessageTime: serverTimestamp()
                  });
                  roomId = newRoomRef.id;
                }
                // Get last message if any
                let lastMessage = {
                  text: "No messages yet",
                  time: "",
                  unread: false
                };
                const messagesQuery = query(
                  collection(db, "messages"),
                  where("roomId", "==", roomId),
                  orderBy("timestamp", "desc"),
                  where("timestamp", "!=", null)
                );
                const messagesSnapshot = await getDocs(messagesQuery);
                if (!messagesSnapshot.empty) {
                  const lastMessageData = messagesSnapshot.docs[0].data();
                  lastMessage = {
                    text: lastMessageData.text || "No message content",
                    time: lastMessageData.timestamp ? 
                      format(new Date(lastMessageData.timestamp.toDate()), "h:mm a") : "",
                    unread: lastMessageData.senderId !== currentUser.uid && 
                           (!lastMessageData.readBy || !lastMessageData.readBy.includes(currentUser.uid))
                  };
                }
                donorContacts.push({
                  id: userDoc.id,
                  name: userData.name || userData.displayName || "Donor",
                  role: "donor" as const,
                  photo: userData.photoURL || null,
                  status: userData.status || "offline",
                  lastMessage,
                  roomId
                });
              }
            }
          }
        }
        // 4. Combine and deduplicate contacts
        const adminContacts = (await Promise.all(adminContactsPromises)).filter(Boolean) as Contact[];
        const allContacts = [...adminContacts, ...donorContacts].filter((contact, idx, arr) =>
          arr.findIndex(c => c.id === contact.id) === idx
        );
        // Set up presence listeners for each contact
        const newPresenceUnsubs: Record<string, () => void> = {};
        allContacts.forEach(contact => {
          newPresenceUnsubs[contact.id] = listenToUserPresence(
            contact.id,
            (online) => {
              setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: online ? "online" : "offline" } : c));
            }
          );
        });
        // Clean up old listeners
        Object.values(presenceUnsubs).forEach(unsub => unsub && unsub());
        setPresenceUnsubs(newPresenceUnsubs);
        setContacts(allContacts);
        if (allContacts.length > 0 && !selectedContact) {
          setSelectedContact(allContacts[0].id);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your contacts"
        });
        setLoading(false);
      }
    };
    
    fetchDonorContacts();
  }, [currentUser?.uid, toast]);
  
  // Clean up presence listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(presenceUnsubs).forEach(unsub => unsub && unsub());
    };
    // eslint-disable-next-line
  }, []);

  // Fetch messages for selected contact
  useEffect(() => {
    if (!selectedContact || !currentUser?.uid) return;
    
    // Find the room ID for this contact
    const contactData = contacts.find(c => c.id === selectedContact);
    if (!contactData?.roomId) return;
    
    const messagesQuery = query(
      collection(db, "messages"),
      where("roomId", "==", contactData.roomId),
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp?.toDate().getTime() || Date.now(),
          isDonor: data.senderId === currentUser.uid,
          read: data.readBy?.includes(currentUser.uid) || data.senderId === currentUser.uid
        };
      });
      
      setMessages(prev => ({
        ...prev,
        [selectedContact]: messagesList
      }));
      
      // Mark messages as read
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (
          data.senderId !== currentUser.uid && 
          (!data.readBy || !data.readBy.includes(currentUser.uid))
        ) {
          const readBy = data.readBy || [];
          updateDoc(doc.ref, {
            readBy: [...readBy, currentUser.uid]
          });
        }
      });
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    
    return () => unsubscribe();
  }, [selectedContact, contacts, currentUser?.uid]);
  
  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.orphanageName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedContact || !currentUser?.uid) return;
    
    try {
      // Find the room ID for this contact
      const contactData = contacts.find(c => c.id === selectedContact);
      if (!contactData?.roomId) {
        toast({
          title: "Error",
          description: "Couldn't find chat room",
          variant: "destructive",
        });
        return;
      }
      
      // Add message to Firestore
      await addDoc(collection(db, "messages"), {
        roomId: contactData.roomId,
        senderId: currentUser.uid,
        receiverId: selectedContact,
        text: messageText.trim(),
        timestamp: serverTimestamp(),
        readBy: [currentUser.uid]
      });
      
      // Update last message in chat room
      await updateDoc(doc(db, "chatRooms", contactData.roomId), {
        lastMessage: {
          text: messageText.trim(),
          senderId: currentUser.uid,
          timestamp: new Date()
        },
        lastMessageTime: serverTimestamp()
      });
      
      // Clear input
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
  
  const currentContact = contacts.find(contact => contact.id === selectedContact);
  const currentMessages = selectedContact && messages[selectedContact] ? messages[selectedContact] : [];
  
  // Format message time
  const formatMessageTime = (timestamp: number) => {
    return format(new Date(timestamp), "h:mm a");
  };

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col">
      <h1 className="text-3xl font-bold mb-4">Messages</h1>
      
      <div className="flex h-full border rounded-lg overflow-hidden">
        {/* Contacts sidebar */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search contacts..."
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-hope-600" />
              </div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map(contact => (
                <div 
                  key={contact.id}
                  onClick={() => setSelectedContact(contact.id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer border-b hover:bg-accent ${
                    selectedContact === contact.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={contact.photo || undefined} alt={contact.name} />
                      <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                    </Avatar>
                    <span 
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                        contact.status === "online" ? "bg-green-500" : "bg-gray-300"
                      }`} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{contact.name}</h3>
                      <span className="text-xs text-muted-foreground">{contact.lastMessage.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.lastMessage.text}
                      </p>
                      {contact.lastMessage.unread && (
                        <span className="h-2 w-2 rounded-full bg-hope-500" />
                      )}
                    </div>
                    {contact.role === "admin" && (
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.orphanageName}
                      </p>
                    )}
                    {contact.role === "donor" && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ml-1">Donor</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-32 p-4 text-center">
                <p className="text-muted-foreground mb-2">No contacts found</p>
                <p className="text-xs text-muted-foreground">
                  You can chat with orphanage admins or other donors after making a donation
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedContact && currentContact ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={currentContact.photo || undefined} alt={currentContact.name} />
                    <AvatarFallback>{getInitials(currentContact.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{currentContact.name}</h3>
                    {currentContact.role === "admin" && (
                      <p className="text-xs text-muted-foreground">
                        {currentContact.orphanageName} • {currentContact.status === "online" ? "Online" : "Offline"}
                      </p>
                    )}
                    {currentContact.role === "donor" && (
                      <p className="text-xs text-muted-foreground">
                        Donor • {currentContact.status === "online" ? "Online" : "Offline"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {currentMessages.length > 0 ? (
                  currentMessages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.isDonor ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.isDonor 
                            ? "bg-hope-100 text-hope-700" 
                            : "bg-gray-100"
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className="text-xs text-muted-foreground text-right mt-1">
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-muted-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Send a message to start the conversation
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 border-t">
                <form 
                  className="flex gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <Input
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <h3 className="font-medium text-lg">Select a conversation</h3>
                <p className="text-muted-foreground mt-1">
                  Choose an orphanage admin from the left to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonorChat;


