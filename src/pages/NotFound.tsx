
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6">
        <div className="mb-6">
          <div className="flex items-center justify-center">
            <div className="text-hope-700 font-bold text-2xl mr-1">Hope</div>
            <div className="text-bridge-500 font-bold text-2xl">Bridge</div>
          </div>
        </div>
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="text-3xl font-semibold text-gray-700">Page Not Found</h2>
        <p className="text-xl text-gray-600 max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="pt-6">
          <Link to="/">
            <Button size="lg">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
