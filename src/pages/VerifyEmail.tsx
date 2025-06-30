import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const { currentUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/signin", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleResend = async () => {
    setLoading(true);
    setError("");
    try {
      if (currentUser) {
        await sendEmailVerification(currentUser);
        setSent(true);
      }
    } catch (err: any) {
      setError("Failed to send verification email. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Sign in required</h1>
          <p className="mb-4 text-center">Please sign in to continue.</p>
          <a href="/signin" className="text-blue-600 underline">Go to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Verify Your Email</h1>
        <p className="mb-4 text-center">
          A verification link has been sent to your email address. Please check your inbox and follow the instructions to verify your account.
        </p>
        <p className="mb-4 text-center text-sm text-gray-500">
          If you don't see the email, check your spam or junk folder.
        </p>
        {sent && (
          <div className="mb-4 text-green-600 text-center">Verification email sent!</div>
        )}
        {error && (
          <div className="mb-4 text-red-600 text-center">{error}</div>
        )}
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          onClick={handleResend}
          disabled={loading}
        >
          {loading ? "Sending..." : "Resend Verification Email"}
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
