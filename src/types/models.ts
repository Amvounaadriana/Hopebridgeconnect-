export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  location: string | null;
  role: "admin" | "donor" | "volunteer";
  photoURL: string | null;
  createdAt: number;
  profession?: string;  // For volunteers
  bio?: string;         // For volunteers
  skills?: string[];    // For volunteers
  availability?: {
    days: string[];
    timeSlots: string[];
  };
  documents?: {
    cv: string | null;
    idCard: string | null;
    certifications: string[];
  };
  orphanageName?: string; // For admins/volunteers linked to an orphanage
  orphanageId?: string;   // For admins/volunteers linked to an orphanage
}

export interface Orphanage {
  id?: string;
  name: string;
  photo: string | null;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  description: string;
  childrenCount: number;
  needs: string[];
  adminId: string;
  createdAt: number;
  location?: string; // For backward compatibility
  establishedYear?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Child {
  id?: string;
  name: string;
  dob: string;
  gender: string;
  photo: string | null;
  orphanageId: string;
  documents: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
  createdAt: number;
}

export interface Wish {
  id?: string;
  childId: string;
  childName: string;
  orphanageId: string;
  item: string;
  description: string;
  quantity: number;
  date: string;
  status: "pending" | "in-progress" | "fulfilled";
  donorId: string | null;
  donorName: string | null;
  createdAt: number;
}

export interface Payment {
  id?: string;
  amount: number;
  currency: string;
  date: string;
  donorId: string;
  donorName: string;
  orphanageId: string;
  childId?: string;
  childName?: string;
  purpose: string;
  status: "successful" | "pending" | "failed";
  transactionId: string;
  createdAt: number;
  paymentUrl?: string;  // URL where the user completes the payment
  gatewayResponse?: any; // Additional data from payment gateway
  lastUpdated?: number;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  orphanageId: string;
  orphanageName: string;
  location: string;
  category: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  slots: number;
  filledSlots: number;
  status: "open" | "signed-up" | "completed";
  volunteers: {
    id: string;
    name: string;
  }[];
  completedHours?: Record<string, number>; // Track completed hours by volunteer ID
  createdAt: number;
}

export interface Conversation {
  id?: string;
  participants: string[];
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  createdAt: number;
}

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
  files?: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface SOSAlert {
  id?: string;
  userId: string;
  userType: "volunteer" | "child";
  userName: string;
  userPhoto: string | null;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  message: string | null;
  status: "active" | "in-progress" | "resolved" | "false-alarm";
  phoneNumber: string;
}

export interface Certificate {
  id?: string;
  title: string;
  description: string;
  issueDate: string | null;
  hoursCompleted: number;
  volunteerId: string;
  volunteerName: string;
  orphanages: {
    id: string;
    name: string;
  }[];
  timeframe: string;
  status: "available" | "processing" | "earned";
  imageUrl: string | null;
  createdAt: number;
}

export interface Sponsorship {
  id?: string;
  childId: string;
  childName: string;
  orphanageId: string;
  orphanageName: string;
  donorId: string;
  type: "monetary" | "in-kind";
  amount: number;
  currency: string;
  frequency: "one-time" | "monthly" | "yearly";
  startDate: string;
  status: "active" | "completed" | "pending";
  lastPayment: string | null;
  nextPayment: string | null;
  createdAt: number;
}
