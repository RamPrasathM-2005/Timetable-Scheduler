import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, ArrowRight, Mail } from "lucide-react";
import { login } from "../../services/authService";
import { ToastContainer, toast } from "react-toastify";

const InputField = ({
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  showPassword,
  setShowPassword,
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
          type={type === "password" && showPassword ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full ${
            type === "password" ? "pl-12 pr-12" : "pl-12 pr-4"
          } py-3.5 border border-gray-200 rounded-xl 
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
          transition-all bg-gray-50 focus:bg-white`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const illustrationUrl = "/4583.jpg";

  // Load saved email if "Remember Me" was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    console.log('Login attempt with:', { email, password }); // Debug log
    try {
      const user = await login(email, password);

      if (rememberMe) {
        localStorage.setItem("email", email);
      } else {
        localStorage.removeItem("email");
      }

      // Role-based redirect
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (user.role === "staff") {
        navigate("/staff/dashboard");
      } else if (user.role === "student") {
        navigate("/student/dashboard");
      } else {
        throw new Error("Unknown role");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Login failed, please check your credentials";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Login error:', err.response?.data || err.message); // Debug log
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col lg:flex-row">
      {/* Illustration */}
      <div className="flex w-full lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 right-20 w-24 h-24 bg-indigo-200/30 rounded-full animate-bounce"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-purple-200/30 rounded-full animate-ping"></div>
        <div className="flex items-center justify-center w-full p-12">
          <div className="relative max-w-lg">
            <img
              src={illustrationUrl}
              alt="Workspace Collaboration"
              className="w-full h-auto rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4 shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your workspace</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50"
          >
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                  {error}
                </div>
              )}

              <InputField
                label="Email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />

              <InputField
                label="Password"
                type="password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight size={20} />
                  </div>
                )}
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                >
                  Create one here
                </button>
              </p>
            </div>
          </form>

          <div className="mt-6 bg-white/60 backdrop-blur-lg rounded-xl p-4 text-sm text-gray-600 border border-white/50">
            <h4 className="font-semibold mb-2 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Demo Credentials
            </h4>
            <div className="space-y-1 text-xs">
              <p>
                <strong>Admin:</strong> admin@nec.edu.in / 123456
              </p>
              <p>
                <strong>Staff:</strong> staff@nec.edu.in / staff123
              </p>
              <p>
                <strong>Student:</strong> student@nec.edu.in / student123
              </p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Login;