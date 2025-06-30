
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Welcome = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div 
        className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-16 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('/images/39b5f0dc-569b-4e45-8d42-5a231c82a021.png')", 
          backgroundSize: 'cover',
          backgroundPosition: 'center' 
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/images/0be6cd2d-26e6-43ca-b7f7-f99d5302b7fc.png" 
              alt="Hope Bridge Logo" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="ml-4">
              <span className="text-hope-700 font-bold text-4xl md:text-5xl mr-1">Hope</span>
              <span className="text-bridge-500 font-bold text-4xl md:text-5xl">Bridge</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Connecting Hearts, Building Futures
          </h1>
          
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Connecting donors, volunteers, and administrators to support children in Cameroon through transparent, direct assistance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-hope-600 hover:bg-hope-700 text-white">
              <Link to="/signup">Sign Up</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Our Mission</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-hope-50 p-6 rounded-lg">
              <div className="text-hope-600 text-4xl mb-4 flex justify-center">🤲</div>
              <h3 className="font-bold text-xl mb-2 text-center">For Donors</h3>
              <p className="text-gray-700">
                Provide a transparent platform where you can directly support children and orphanages in Cameroon, with real-time updates on how your donations are making an impact.
              </p>
            </div>
            
            <div className="bg-bridge-50 p-6 rounded-lg">
              <div className="text-bridge-600 text-4xl mb-4 flex justify-center">🏠</div>
              <h3 className="font-bold text-xl mb-2 text-center">For Orphanages</h3>
              <p className="text-gray-700">
                Offer tools to efficiently manage resources, coordinate volunteers, and communicate needs directly to donors, ensuring children receive the support they deserve.
              </p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="text-green-600 text-4xl mb-4 flex justify-center">✋</div>
              <h3 className="font-bold text-xl mb-2 text-center">For Volunteers</h3>
              <p className="text-gray-700">
                Connect passionate individuals with opportunities to make a difference through their time and skills, while tracking hours and earning certificates for service.
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <Button asChild size="lg" className="bg-hope-600 hover:bg-hope-700">
              <Link to="/signup">Join Us Today</Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white/80">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-hope-400 font-bold text-xl mr-1">Hope</span>
            <span className="text-bridge-400 font-bold text-xl">Bridge</span>
            <span className="text-white font-bold text-xl"> Connect</span>
          </div>
          <p>© 2025 HopeBridge Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
