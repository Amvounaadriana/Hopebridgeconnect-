import { useState, useEffect, useRef } from "react";
import { listenToUserPresence } from "@/services/volunteer-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send, Phone, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
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
  roomId: string | null;
  name: string;
  role: "donor" | "volunteer" | "admin";
  photo: string | null;
  status: "online" | "offline";
  lastMessage: {
    text: string;
    time: string;
    unread: boolean;
  };
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isAdmin: boolean;
  read: boolean;
}

const AdminChat = () => {
  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [presenceUnsubs, setPresenceUnsubs] = useState<Record<string, () => void>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Effect to load contacts from Firestore
  useEffect(() => {
    if (!currentUser?.uid || !userProfile) return;
    setLoading(true);
    const fetchContacts = async () => {
      try {
        // 1. Get all other admins (exclude current admin by both doc.id and doc.data().uid)
        const adminsQuery = query(
          collection(db, "users"),
          where("role", "==", "admin")
        );
        const adminsSnapshot = await getDocs(adminsQuery);
        const adminContacts = adminsSnapshot.docs
          .filter(doc => doc.id !== currentUser.uid && doc.data().uid !== currentUser.uid)
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              roomId: null, // Will be set later
              name: data.name || data.displayName || "Admin",
              role: "admin",
              photo: data.photo || data.photoURL || null,
              status: data.status || "offline",
              lastMessage: { text: "", time: "", unread: false }
            };
          });
        // 2. Get orphanage(s) managed by this admin
        let orphanageIds: string[] = [];
        // Try to get orphanageId from user document
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.orphanageId) {
            orphanageIds = [userData.orphanageId];
          }
        }
        if (orphanageIds.length === 0) {
          // fallback: fetch orphanages by adminId
          const orphanagesQuery = query(
            collection(db, "orphanages"),
            where("adminId", "==", currentUser.uid)
          );
          const orphanagesSnapshot = await getDocs(orphanagesQuery);
          orphanageIds = orphanagesSnapshot.docs.map(doc => doc.id);
        }
        // 3. Get donors who have donated or sponsored to this orphanage
        let donorIds = new Set<string>();
        if (orphanageIds.length > 0) {
          // Donations
          const donationsQuery = query(
            collection(db, "payments"),
            where("orphanageId", "in", orphanageIds)
          );
          const donationsSnapshot = await getDocs(donationsQuery);
          donationsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.donorId) donorIds.add(data.donorId);
          });
          // Sponsorships
          const sponsorshipsQuery = query(
            collection(db, "sponsorships"),
            where("orphanageId", "in", orphanageIds)
          );
          const sponsorshipsSnapshot = await getDocs(sponsorshipsQuery);
          sponsorshipsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.donorId) donorIds.add(data.donorId);
          });
        }
        // 4. Get volunteers assigned to this orphanage
        let volunteerIds = new Set<string>();
        if (orphanageIds.length > 0) {
          const volunteersQuery = query(
            collection(db, "users"),
            where("role", "==", "volunteer"),
            where("orphanageId", "in", orphanageIds)
          );
          const volunteersSnapshot = await getDocs(volunteersQuery);
          volunteersSnapshot.forEach(doc => volunteerIds.add(doc.id));
        }
        // 5. Fetch donor and volunteer user profiles
        const userIds = Array.from(new Set([
          ...Array.from(donorIds),
          ...Array.from(volunteerIds)
        ]));
        let donorVolunteerContacts: Contact[] = [];
        if (userIds.length > 0) {
          // Firestore only allows up to 10 in 'in' queries
          const batchSize = 10;
          for (let i = 0; i < userIds.length; i += batchSize) {
            const batchIds = userIds.slice(i, i + batchSize);
            const usersQuery = query(
              collection(db, "users"),
              where("uid", "in", batchIds)
            );
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
              const data = doc.data();
              donorVolunteerContacts.push({
                id: doc.id,
                roomId: null, // Will be set later
                name: data.name || data.displayName || "User",
                role: data.role,
                photo: data.photo || data.photoURL || null,
                status: data.status || "offline",
                lastMessage: { text: "", time: "", unread: false }
              });
            });
          }
        }
        // 6. Combine all contacts, filter to allowed roles
        let allContacts: Contact[] = [...adminContacts, ...donorVolunteerContacts]
          .filter(c => c.role === "admin" || c.role === "donor" || c.role === "volunteer")
          .map(c => ({
            ...c,
            // Type assertion for role
            role: c.role as "admin" | "donor" | "volunteer"
          }));
        // 7. For each contact, find or create a chat room (roomId)
        for (let contact of allContacts) {
          // Room participants: always [currentUser.uid, contact.id] (sorted)
          const participants = [currentUser.uid, contact.id].sort();
          const chatRoomsQuery = query(
            collection(db, "chatRooms"),
            where("participants", "==", participants)
          );
          const chatRoomsSnapshot = await getDocs(chatRoomsQuery);
          if (!chatRoomsSnapshot.empty) {
            contact.roomId = chatRoomsSnapshot.docs[0].id;
            // Optionally, get lastMessage
            const data = chatRoomsSnapshot.docs[0].data();
            if (data.lastMessage) {
              contact.lastMessage = {
                text: data.lastMessage.text || "",
                time: data.lastMessage.timestamp ? format(new Date(data.lastMessage.timestamp.toDate ? data.lastMessage.timestamp.toDate() : data.lastMessage.timestamp), "h:mm a") : "",
                unread: data.lastMessage.senderId !== currentUser.uid && (!data.lastMessage.readBy || !data.lastMessage.readBy.includes(currentUser.uid))
              };
            }
          } else {
            // No room yet, will be created on first message
            contact.roomId = null;
          }
        }
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
        setLoading(false);

        // Check if there's a contact parameter in the URL
        const contactParam = searchParams.get("contact");
        if (contactParam && !selectedContact) {
          const contactExists = allContacts.find(c => c.id === contactParam);
          if (contactExists) {
            setSelectedContact(contactParam);
          }
        }
      } catch (error) {
        setContacts([]);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load contacts",
          variant: "destructive"
        });
      }
    };

    fetchContacts();
    // eslint-disable-next-line
  }, [currentUser?.uid, userProfile, searchParams, selectedContact]);
  
  // Clean up presence listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(presenceUnsubs).forEach(unsub => unsub && unsub());
    };
    // eslint-disable-next-line
  }, []);

  // Effect to load messages for selected contact from Firestore
  useEffect(() => {
    if (!selectedContact || !currentUser?.uid) return;
    
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
          isAdmin: data.senderId === currentUser.uid,
          read: data.readBy?.includes(currentUser.uid) || data.senderId === currentUser.uid
        };
      });
      
      setMessages(messagesList);
      
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
    });
    
    return () => unsubscribe();
  }, [selectedContact, contacts, currentUser?.uid]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedContact) {
      toast({
        title: "No contact selected",
        description: "Please select a contact to send a message.",
        variant: "destructive",
      });
      return;
    }
    try {
      const contactData = contacts.find(c => c.id === selectedContact);
      if (!contactData?.roomId) {
        toast({
          title: "No chat room",
          description: "Couldn't find or create a chat room for this contact.",
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
          timestamp: serverTimestamp()
        },
        lastMessageTime: serverTimestamp()
      });
      
      // Clear input
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };
  
  const formatMessageTime = (timestamp: number) => {
    return format(new Date(timestamp), "h:mm a");
  };
  
  const currentContact = contacts.find(contact => contact.id === selectedContact);
  
  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col">
      <h1 className="text-3xl font-bold mb-4">Chat</h1>
      
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
                <p className="text-muted-foreground">Loading contacts...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-muted-foreground">No contacts found</p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div 
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact.id);
                    // Update URL with contact parameter
                    setSearchParams({ contact: contact.id });
                  }}
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
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                  
                  <Badge variant={contact.role === "donor" ? "default" : "outline"}>
                    {contact.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedContact && currentContact ? (
            <>
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={currentContact.photo || undefined} alt={currentContact.name} />
                    <AvatarFallback>{getInitials(currentContact.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{currentContact.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {currentContact.status === "online" ? "Online" : "Offline"}
                      </p>
                      <Badge variant={currentContact.role === "donor" ? "default" : "outline"}>
                        {currentContact.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-muted-foreground">No messages yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Send a message to start the conversation
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.isAdmin 
                            ? "bg-blue-100 text-blue-700" 
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
                  <Button type="submit" size="icon" disabled={!messageText.trim()}>
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
                  Choose a contact from the left to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
