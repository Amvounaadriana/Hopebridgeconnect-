
import { ReactNode } from "react";
import Header from "@/components/Header";
import DonorSidebar from "@/components/DonorSidebar";
import MobileNav from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface DonorLayoutProps {
  children: ReactNode;
}

const DonorLayout = ({ children }: DonorLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        {!isMobile && <DonorSidebar />}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
      {isMobile && <MobileNav userRole="donor" />}
    </div>
  );
};

export default DonorLayout;
