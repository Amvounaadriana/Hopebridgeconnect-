
import { ReactNode } from "react";
import Header from "@/components/Header";
import AdminSidebar from "@/components/AdminSidebar";
import MobileNav from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const isMobile = useIsMobile();

  // Add console logging to the AdminLayout component
  console.log("AdminLayout rendering", { children: !!children });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        {!isMobile && <AdminSidebar />}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Add this line to ensure children are rendered */}
          <div className="debug-children">{children ? "Children exist" : "No children"}</div>
          {children}
        </main>
      </div>
      {isMobile && <MobileNav userRole="admin" />}
    </div>
  );
};

export default AdminLayout;

