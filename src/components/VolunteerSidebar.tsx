
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Calendar, 
  MessageSquare, 
  User, 
  CheckSquare, 
  Award, 
  AlertTriangle,
  LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const VolunteerSidebar = () => {
  const { pathname } = useLocation();
  const { logout } = useAuth();  // Changed from signOut to logout

  const navItems = [
    {
      title: "Dashboard",
      href: "/volunteer/dashboard",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Tasks",
      href: "/volunteer/tasks",
      icon: <CheckSquare className="h-4 w-4" />,
    },
    {
      title: "Calendar",
      href: "/volunteer/calendar",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: "Certificates",
      href: "/volunteer/certificates",
      icon: <Award className="h-4 w-4" />,
    },
    {
      title: "Messages",
      href: "/volunteer/chat",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      title: "Profile",
      href: "/volunteer/profile",
      icon: <User className="h-4 w-4" />,
    },
    {
      title: "SOS",
      href: "/volunteer/sos",
      icon: <AlertTriangle className="h-4 w-4" />,
      className: "text-red-500",
    },
  ];

  return (
    <div className="w-64 border-r bg-background h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-3 py-2 flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              } ${item.className || ""}`
            }
          >
            {item.icon}
            {item.title}
          </NavLink>
        ))}
      </div>

      <div className="border-t p-3 mt-auto">
        <button
          onClick={logout}  // Changed from signOut to logout
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default VolunteerSidebar;
