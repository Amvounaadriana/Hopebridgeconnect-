
import { ReactNode } from "react";
import Header from "@/components/Header";
import VolunteerSidebar from "@/components/VolunteerSidebar";
import MobileNav from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface VolunteerLayoutProps {
  children: ReactNode;
}

const VolunteerLayout = ({ children }: VolunteerLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        {!isMobile && <VolunteerSidebar />}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
      {isMobile && <MobileNav userRole="volunteer" />}
    </div>
  );
};

export default VolunteerLayout;
