// User Profile (users collection)
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  location: string;
  role: 'admin' | 'donor' | 'volunteer';
  photoURL: string | null;
  createdAt: number;
  profession?: string; // For volunteers
  bio?: string; // For volunteers
  skills?: string[];
  availability?: Availability;
  documents?: UserDocuments;
}

export interface UserDocuments {
  certifications?: string[];
  cv?: string | null;
  idCard?: string | null;
}

export interface Availability {
  days: string[];
  preferredOrphanages?: string[];
  timeSlots: Array<{
    day: string;
    startTime: string;
    endTime: string;
    orphanageId: string;
  }>;
}

// Orphanage (orphanages collection)
export interface Orphanage {
  id: string;
  name: string;
  photo: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  description: string;
  childrenCount: number;
  needs: string[];
  adminId: string;
  location: string;
  createdAt: number;
  updatedAt: number;
}

// Child (children collection)
export interface Child {
  id: string;
  name: string;
  dob: string;
  gender: string;
  photo: string;
  orphanageId: string;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  createdAt: number;
}

// Wish (wishes collection)
export interface Wish {
  id: string;
  childId: string;
  childName: string;
  orphanageId: string;
  item: string;
  description: string;
  quantity: number;
  date: string;
  status: 'pending' | 'in-progress' | 'fulfilled';
  donorId: string | null;
  donorName: string | null;
  createdAt: number;
}

// Payment (payments collection)
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  date: string;
  donorId: string;
  donorName: string;
  orphanageId: string;
  childId?: string;
  childName?: string;
  purpose: string;
  status: 'succesful' | 'pending' | 'failed';
  transactionId: string;
  createdAt: number;
  paymentUrl?: string;
  gatewayResponse?: any;
  lastUpdated?: number;
}

// Task (tasks collection)
export interface Task {
  id: string;
  title: string;
  description: string;
  orphanageId: string;
  orphanageName: string;
  location: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
  filledSlots: number;
  statuts: 'open' | 'signed-up' | 'completed';
  volunteers: Array<{
    id: string;
    name: string;
  }>;
  completedHours?: Record<string, number>;
  createdAt: number;
}

// Volunteer Hours (volunteer hours collection)
export interface VolunteerHour {
  id: string;
  volunteerId: string;
  volunteerName: string;
  orphanageId: string;
  orphanageName: string;
  taskId: string;
  taskTitle: string;
  date: string;
  hours: number;
  notes?: string;
  createdAt: number;
}

// Certificate (certification collection)
export interface Certificate {
  id: string;
  title: string;
  description: string;
  issueDate: string;
  hoursCompleted: number;
  volunteerId: string;
  volunteerName: string;
  orphanages: Array<{
    id: string;
    name: string;
  }>;
  timeframe: string;
  status: 'available' | 'processing' | 'earned';
  imageUrl: string;
  createdAt: number;
}

// Sponsorship (sponsorship collection)
export interface Sponsorship {
  id: string;
  childId: string;
  childName: string;
  orphanageId: string;
  orphanageName: string;
  donorId: string;
  type: 'monetary' | 'in-kind';
  amount: number;
  currency: string;
  frequency: 'one-time' | 'monthly' | 'yearly';
  startDate: string;
  status: 'active' | 'completed' | 'pending';
  lastPayment: string;
  nextPayment: string;
  createdAt: number;
}

// SOS Alert (sos alerts collection)
export interface SOSAlert {
  id: string;
  userId: string;
  userType: 'volunteer' | 'child';
  userName: string;
  userPhoto: string;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  message: string;
  status: 'active' | 'in-progress' | 'resolved' | 'false-alarm';
  phoneNumber: string;
}

// Conversation (conversation collection)
export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  createdAt: number;
}

// Message (messages collection)
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
  files?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}
