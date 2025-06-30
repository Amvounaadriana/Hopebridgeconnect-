import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  User, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile, sendEmailVerification
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types/models";

export type UserRole = "admin" | "donor" | "volunteer";

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isEmailVerified: boolean;
  signup: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  login: (email: string, password: string, expectedRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Simple toast function (you can replace this with your actual toast implementation)
  const showToast = (title: string, description: string, variant?: "default" | "destructive") => {
    console.log(`Toast: ${title} - ${description} (${variant || 'default'})`);
    // You can replace this with your actual toast implementation
  };

  async function signup(email: string, password: string, userData: Partial<UserProfile>) {
    try {
      console.log("Starting signup process...");
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (userData.displayName) {
        await updateProfile(result.user, {
          displayName: userData.displayName
        });
      }
      
      // Create user profile in Firestore
      const newProfile: UserProfile = {
        uid: result.user.uid,
        displayName: userData.displayName || null,
        email: result.user.email,
        phoneNumber: userData.phoneNumber || null,
        location: userData.location || null,
        role: userData.role || "donor", // Default to donor
        photoURL: result.user.photoURL,
        createdAt: Date.now()
      };
      
      console.log("Creating user profile:", newProfile);
      await setDoc(doc(db, "users", result.user.uid), newProfile);
      
      // Send email verification
      await sendEmailVerification(result.user);
      
      // IMPORTANT: Sign out the user after signup to force them to sign in
      await signOut(auth);
      console.log("User signed out after signup");
      
      showToast(
        "Account created successfully",
        "A verification email has been sent. Please verify your email before signing in."
      );
      
      // Redirect to verify email page
      window.location.href = "/verify-email";
      return;
    } catch (error: any) {
      console.error("Signup error:", error);
      // Handle specific Firebase auth errors
      let errorMessage = "Registration failed";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please use a different email or try signing in.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      }
      
      showToast(
        "Registration failed",
        errorMessage,
        "destructive"
      );
      throw error;
    }
  }

  async function login(email: string, password: string, expectedRole?: UserRole) {
    try {
      console.log("Starting login process...");
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase auth successful, user:", result.user.uid);

      // Enforce email verification
      if (!result.user.emailVerified) {
        await signOut(auth);
        showToast(
          "Email not verified",
          "Please verify your email address before signing in.",
          "destructive"
        );
        throw new Error("Email not verified. Please verify your email before signing in.");
      }
      
      // Verify user role if expectedRole is provided
      if (expectedRole) {
        const userDocRef = doc(db, "users", result.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error("User profile not found");
        }
        
        const userData = userDoc.data() as UserProfile;
        console.log("User data from Firestore:", userData);
        
        if (userData.role !== expectedRole) {
          // Sign out the user if role doesn't match
          await signOut(auth);
          throw new Error(`Invalid role. Please sign in as a ${expectedRole}.`);
        }
      }
      
      console.log("Login successful!");
      showToast(
        "Login successful",
        "Welcome back!"
      );
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Login failed";
      
      if (error.message === `Invalid role. Please sign in as a ${expectedRole}.`) {
        errorMessage = error.message;
      } else if (error.message === "Email not verified. Please verify your email before signing in.") {
        errorMessage = error.message;
      } else if (error.code === "auth/invalid-login-credentials" || 
          error.code === "auth/user-not-found" || 
          error.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Please contact support.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later or reset your password.";
      }
      
      showToast(
        "Login failed",
        errorMessage,
        "destructive"
      );
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      showToast(
        "Logged out",
        "You've been successfully logged out"
      );
    } catch (error: any) {
      showToast(
        "Logout failed",
        error.message,
        "destructive"
      );
      throw error;
    }
  }

  async function updateUserProfile(data: Partial<UserProfile>) {
    if (!currentUser) {
      showToast(
        "Update failed",
        "No user is logged in",
        "destructive"
      );
      throw new Error("No user is logged in");
    }
    
    try {
      // Update display name if provided
      if (data.displayName) {
        await updateProfile(currentUser, {
          displayName: data.displayName
        });
      }
      
      // Update profile in Firestore
      const userRef = doc(db, "users", currentUser.uid);
      const updatedData = {
        ...data,
        updatedAt: Date.now()
      };
      
      await setDoc(userRef, updatedData, { merge: true });
      
      // Fetch the updated profile
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
      
      showToast(
        "Profile updated",
        "Your profile has been updated successfully"
      );
    } catch (error: any) {
      showToast(
        "Update failed",
        error.message,
        "destructive"
      );
      throw error;
    }
  }

  useEffect(() => {
    console.log("Setting up auth state listener...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? `User: ${user.uid}` : "No user");
      setCurrentUser(user);
      setIsEmailVerified(!!user?.emailVerified);
      
      if (user) {
        try {
          console.log("Fetching user profile from Firestore...");
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            console.log("User profile loaded:", profile);
            setUserProfile(profile);
          } else {
            console.log("No user profile found, creating basic profile...");
            // If user exists in auth but not in Firestore, create a basic profile
            const basicProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              phoneNumber: user.phoneNumber,
              location: null,
              role: "donor", // Default role
              photoURL: user.photoURL,
              createdAt: Date.now()
            };
            
            await setDoc(docRef, basicProfile);
            console.log("Basic profile created:", basicProfile);
            setUserProfile(basicProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        console.log("No user, clearing profile...");
        setUserProfile(null);
      }
      
      console.log("Setting loading to false...");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  console.log("AuthProvider render - currentUser:", currentUser?.uid, "userProfile:", userProfile?.role, "loading:", loading);

  const value = {
    currentUser,
    userProfile,
    loading,
    isEmailVerified,
    signup,
    login,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <span className="text-lg text-gray-500">Loading...</span>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}