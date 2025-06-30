import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const { login, currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Debug logging
  console.log("SignIn render - currentUser:", currentUser?.uid, "userProfile:", userProfile?.role, "loading:", loading);

  useEffect(() => {
    // Check if we came from signup with a success message
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Pre-fill email if provided
      if (location.state.email) {
        setEmail(location.state.email);
      }
    }
  }, [location.state]);

  // Redirect user if they're already logged in
  useEffect(() => {
    if (!loading && currentUser && userProfile) {
      console.log("User already logged in, redirecting based on role:", userProfile.role);
      switch (userProfile.role) {
        case "admin":
          navigate("/admin/dashboard", { replace: true });
          break;
        case "donor":
          navigate("/donor/dashboard", { replace: true });
          break;
        case "volunteer":
          navigate("/volunteer/dashboard", { replace: true });
          break;
        default:
          console.log("Unknown role:", userProfile.role);
          navigate("/", { replace: true });
      }
    }
  }, [currentUser, userProfile, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    console.log("Attempting to sign in with email:", email);

    try {
      // Don't pass expectedRole - let the user sign in and then redirect based on their actual role
      await login(email, password);
      console.log("Login function completed successfully");
      
      // The useEffect above will handle redirection once currentUser and userProfile are set
      
    } catch (error: any) {
      console.error("Login error in component:", error);
      // Display user-friendly error messages
      setError(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render the form if user is already authenticated
  if (!loading && currentUser && userProfile) {
    return <div>Redirecting...</div>;
  }

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center"
      style={{ 
        backgroundImage: "url('/images/39b5f0dc-569b-4e45-8d42-5a231c82a021.png')", 
        backgroundSize: 'cover',
        backgroundPosition: 'center' 
      }}
    >
      <div className="absolute inset-0 bg-black/70"></div>
      <Card className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              <img 
                src="/images/0be6cd2d-26e6-43ca-b7f7-f99d5302b7fc.png" 
                alt="Hope Bridge Logo" 
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <span className="text-hope-700 font-bold text-2xl mr-1">Hope</span>
                <span className="text-bridge-500 font-bold text-2xl">Bridge</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Sign in to your account</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {successMessage && (
              <div className="p-3 text-sm text-green-800 bg-green-100 border border-green-200 rounded-md">
                {successMessage}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-hope-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            {/* Debug info - remove this in production */}
            <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
              Debug: Loading: {loading.toString()}, User: {currentUser?.uid || 'None'}, Role: {userProfile?.role || 'None'}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-hope-600 hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignIn;