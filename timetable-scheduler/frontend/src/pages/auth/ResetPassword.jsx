import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock, ArrowLeft, ArrowRight } from "lucide-react";
import { resetPassword } from "../../services/authService";
import { ToastContainer, toast } from "react-toastify";

const InputField = ({
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  required = true,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
        />
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const [Password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (Password !== confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (Password.length < 6) {
      setError("Password must be at least 6 characters");
      toast.error("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const msg = await resetPassword(token, Password);
      setMessage(msg);
      toast.success(msg);
      setTimeout(() => navigate("/login"), 2000);
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
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600">Enter your new password.</p>
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
          <InputField
            label="New Password"
            type="password"
            icon={Lock}
            value={Password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password (min 6 chars)"
          />
          <InputField
            label="Confirm Password"
            type="password"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Resetting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Reset Password</span>
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

export default ResetPassword;