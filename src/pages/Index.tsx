
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage = () => {
  const { currentUser, userProfile } = useAuth();
  
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-hope-700 font-bold text-xl mr-1">Hope</div>
            <div className="text-bridge-500 font-bold text-xl">Bridge</div>
          </div>
          <nav>
            {currentUser ? (
              <Link to={getDashboardPath()}>
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <div className="flex gap-4">
                <Link to="/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 md:py-24 relative">
          {/* Background image of children */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 after:absolute after:inset-0 after:bg-black/40"
            style={{ backgroundImage: "url('/lovable-uploads/e4711a5c-a943-45be-86da-7c89375dda58.png')" }}
          ></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              <span className="text-hope-300">Hope</span>
              <span className="text-bridge-300">Bridge</span>
              <span className="block text-3xl md:text-4xl mt-2 text-white">Connect</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 text-white">
              Connecting donors, volunteers, and administrators to support children in Cameroon
            </p>
            {!currentUser && (
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
                    Sign Up
                  </Button>
                </Link>
                <Link to="/signin">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg bg-white/10 backdrop-blur-sm hover:bg-white/20">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Mission</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-hope-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3 text-hope-700">For Donors</h3>
                <p className="text-gray-700">
                  Connect directly with orphanages in Cameroon. Make monetary donations or fulfill specific wishes for children in need.
                </p>
              </div>
              <div className="bg-bridge-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3 text-bridge-700">For Volunteers</h3>
                <p className="text-gray-700">
                  Offer your skills and time to support children. Teach, mentor, or help with daily activities to make a real difference.
                </p>
              </div>
              <div className="bg-hope-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3 text-hope-700">For Administrators</h3>
                <p className="text-gray-700">
                  Manage your orphanage efficiently. Connect with donors, coordinate volunteers, and ensure children receive the support they need.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-12">Make a Difference Today</h2>
            <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-700">
              Join our community of donors and volunteers working together to improve the lives of children in Cameroon.
            </p>
            {!currentUser && (
              <Link to="/signup">
                <Button size="lg" className="px-8">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center justify-center md:justify-start">
                <div className="text-hope-300 font-bold text-xl mr-1">Hope</div>
                <div className="text-bridge-300 font-bold text-xl">Bridge</div>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Connecting hearts, changing lives
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} HopeBridge Connect. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
