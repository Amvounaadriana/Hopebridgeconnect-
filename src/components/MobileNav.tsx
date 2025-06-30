
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Heart,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  Map,
  User,
  CheckSquare,
  File,
} from "lucide-react";
import { UserRole } from "@/contexts/AuthContext";

interface MobileNavProps {
  userRole: UserRole;
}

const MobileNav = ({ userRole }: MobileNavProps) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  const adminNavItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    { name: "Children", href: "/admin/children", icon: Users },
    { name: "Wishes", href: "/admin/wishes", icon: Heart },
    { name: "Volunteers", href: "/admin/volunteers", icon: Users },
    { name: "Chat", href: "/admin/chat", icon: MessageSquare },
  ];
  
  const donorNavItems = [
    { name: "Dashboard", href: "/donor/dashboard", icon: Home },
    { name: "Orphanages", href: "/donor/orphanages", icon: Map },
    { name: "Sponsorships", href: "/donor/sponsorships", icon: Heart },
    { name: "Chat", href: "/donor/chat", icon: MessageSquare },
  ];
  
  const volunteerNavItems = [
    { name: "Dashboard", href: "/volunteer/dashboard", icon: Home },
    { name: "Tasks", href: "/volunteer/tasks", icon: CheckSquare },
    { name: "Profile", href: "/volunteer/profile", icon: User },
    { name: "Calendar", href: "/volunteer/calendar", icon: Calendar },
    { name: "Certificates", href: "/volunteer/certificates", icon: File },
  ];
  
  const getNavItems = () => {
    switch (userRole) {
      case "admin":
        return adminNavItems;
      case "donor":
        return donorNavItems;
      case "volunteer":
        return volunteerNavItems;
      default:
        return [];
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-6 md:hidden">
      <div className="flex justify-around">
        {getNavItems().map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex flex-col items-center p-1",
              isActive(item.href)
                ? "text-hope-700"
                : "text-gray-500"
            )}
            aria-label={item.name}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
