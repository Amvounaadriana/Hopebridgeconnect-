
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Map,
  Heart,
  MessageSquare,
} from "lucide-react";

const DonorSidebar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  const navItems = [
    {
      name: "Dashboard",
      href: "/donor/dashboard",
      icon: Home,
    },
    {
      name: "Orphanages",
      href: "/donor/orphanages",
      icon: Map,
    },
    {
      name: "My Sponsorships",
      href: "/donor/sponsorships",
      icon: Heart,
    },
    {
      name: "Chat",
      href: "/donor/chat",
      icon: MessageSquare,
    },
  ];

  return (
    <nav className="w-64 bg-sidebar border-r min-h-[calc(100vh-4rem)] py-6 px-3 space-y-2 hidden md:block">
      {navItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            isActive(item.href)
              ? "bg-hope-100 text-hope-700"
              : "text-gray-600 hover:bg-hope-50 hover:text-hope-700"
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.name}
        </Link>
      ))}
    </nav>
  );
};

export default DonorSidebar;
