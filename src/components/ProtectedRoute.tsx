import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { currentUser, userProfile, isEmailVerified } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  
  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
    // Redirect to appropriate dashboard based on role
    if (userProfile?.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userProfile?.role === "donor") {
      return <Navigate to="/donor/dashboard" replace />;
    } else if (userProfile?.role === "volunteer") {
      return <Navigate to="/volunteer/dashboard" replace />;
    }
    
    // Fallback to landing page if role doesn't match any known type
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
