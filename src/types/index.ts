
import { UserRole } from "@/contexts/AuthContext";

export interface Orphanage {
  id: string;
  name: string;
  photoURL: string;
  address: string;
  phone: string;
  country: string;
  region: string;
  totalChildren: number;
  adminId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Child {
  id: string;
  name: string;
  photoURL: string;
  dateOfBirth: string;
  orphanageId: string;
  documents: {
    birthCertificate?: string;
    medicalBooklet?: string;
    [key: string]: string | undefined;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Wish {
  id: string;
  childId: string;
  orphanageId: string;
  item: string;
  quantity: number;
  status: "pending" | "in-progress" | "fulfilled";
  donorId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProgressLog {
  id: string;
  childId: string;
  category: "physical" | "emotional" | "educational";
  note: string;
  date: number;
  createdBy: string;
}

export interface Donation {
  id: string;
  donorId: string;
  orphanageId: string;
  childId?: string;
  wishId?: string;
  type: "monetary" | "in-kind";
  amount?: number;
  item?: string;
  quantity?: number;
  status: "pending" | "completed" | "cancelled";
  paymentId?: string;
  createdAt: number;
}

export interface Volunteer {
  id: string;
  userId: string;
  skills: string[];
  availability: {
    days: string[];
    timeSlots: string[];
  };
  hoursLogged: number;
  cv?: string;
  careerDetails?: string;
}

export interface VolunteerTask {
  id: string;
  orphanageId: string;
  title: string;
  description: string;
  date: number;
  duration: number;
  category: string;
  status: "open" | "assigned" | "completed";
  volunteerId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SOSAlert {
  id: string;
  senderId: string;
  senderRole: UserRole;
  orphanageId: string;
  message: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: "active" | "resolved";
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "message" | "donation" | "wish" | "sos" | "volunteer" | "system";
  read: boolean;
  relatedId?: string;
  timestamp: number;
}

export interface Certificate {
  id: string;
  volunteerId: string;
  orphanageId: string;
  hours: number;
  issuedDate: number;
  pdfUrl?: string;
}
