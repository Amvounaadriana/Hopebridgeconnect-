
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Notification } from "@/types";

const Header = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getDashboardPath = () => {
    if (!userProfile) return "/";
    
    switch (userProfile.role) {
      case "admin":
        return "/admin/dashboard";
      case "donor":
        return "/donor/dashboard";
      case "volunteer":
        return "/volunteer/dashboard";
      default:
        return "/";
    }
  };

  const NotificationBell = () => {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
      if (!currentUser?.uid) return;

      // Set up real-time listener for notifications
      const notificationsRef = collection(db, "notifications");
      const notificationsQuery = query(
        notificationsRef,
        where("userId", "==", currentUser.uid),
        orderBy("timestamp", "desc")
      );

      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationsList: Notification[] = [];
        let unread = 0;

        snapshot.forEach((doc) => {
          const data = doc.data() as Notification;
          const notification = {
            ...data,
            id: doc.id,
          };
          notificationsList.push(notification);
          
          if (!notification.read) {
            unread++;
          }
        });

        setNotifications(notificationsList);
        setUnreadCount(unread);
      }, (error) => {
        console.error("Error fetching notifications:", error);
      });

      return () => unsubscribe();
    }, [currentUser?.uid]);

    const handleNotificationClick = async (notification: Notification) => {
      // Mark notification as read
      if (!notification.read) {
        try {
          const notificationRef = doc(db, "notifications", notification.id);
          await updateDoc(notificationRef, { read: true });
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      }

      // Navigate based on notification type
      if (notification.type === "message") {
        window.location.href = `/volunteer/chat?id=${notification.relatedId}`;
      } else if (notification.type === "sos") {
        window.location.href = "/volunteer/sos?tab=respond";
      } else if (notification.type === "volunteer") {
        window.location.href = "/volunteer/tasks";
      }

      setOpen(false);
    };

    const markAllAsRead = async () => {
      try {
        const batch = writeBatch(db);
        
        notifications.forEach(notification => {
          if (!notification.read) {
            const notificationRef = doc(db, "notifications", notification.id);
            batch.update(notificationRef, { read: true });
          }
        });
        
        await batch.commit();
        toast({
          title: "Notifications",
          description: "All notifications marked as read",
        });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        toast({
          title: "Error",
          description: "Failed to mark notifications as read",
          variant: "destructive",
        });
      }
    };

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case "message":
          return "💬";
        case "sos":
          return "🚨";
        case "volunteer":
          return "👋";
        case "donation":
          return "💰";
        case "wish":
          return "🎁";
        default:
          return "📣";
      }
    };

    const getTimeAgo = (timestamp: number) => {
      const now = new Date();
      const notificationTime = new Date(timestamp);
      const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000);
      
      if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 10 && (
            <div className="p-2 text-center border-t">
              <Button variant="link" size="sm" onClick={() => toast({ title: "View all notifications" })}>
                View all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to={getDashboardPath()}>
              <div className="flex items-center">
                <div className="text-hope-700 font-bold text-xl mr-1">Hope</div>
                <div className="text-bridge-500 font-bold text-xl">Bridge</div>
              </div>
            </Link>
          </div>

          {currentUser && (
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={currentUser.photoURL || undefined}
                        alt={currentUser.displayName || "User"}
                      />
                      <AvatarFallback>
                        {getInitials(currentUser.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {currentUser.displayName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;




