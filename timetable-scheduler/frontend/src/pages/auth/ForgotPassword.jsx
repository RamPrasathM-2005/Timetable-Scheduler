import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { forgotPassword } from "../../services/authService";
import { ToastContainer, toast } from "react-toastify";

const ForgotPassword = () => {
  const [Email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const msg = await forgotPassword(Email);
      setMessage(msg);
      toast.success(msg);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50 w-full max-w-md">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center mb-4 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Login
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
          <p className="text-gray-600">Enter your email to receive a reset link.</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center mb-6">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center mb-6">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                value={Email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Send Reset Link</span>
                <ArrowRight size={20} />
              </div>
            )}
          </button>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
};

export default ForgotPassword;