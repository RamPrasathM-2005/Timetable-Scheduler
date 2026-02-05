import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Briefcase, ArrowRight } from "lucide-react";
import { register, getDepartments } from "../../services/authService";
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

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState("staff");
  const [Deptid, setDeptid] = useState("");
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const departmentList = await getDepartments();
        setDepartments(departmentList);
        if (departmentList.length > 0) {
          setDeptid(departmentList[0].Deptid); // Set default Deptid
        }
      } catch (err) {
        setError("Failed to load departments");
        toast.error("Failed to load departments");
      }
    };
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate inputs
    if (!name || !email || !password || !role || !username || !Deptid) {
      setError("Name, email, password, role, username, and department are required");
      toast.error("Name, email, password, role, username, and department are required");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      toast.error("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    if (staffId && isNaN(staffId)) {
      setError("Staff ID must be a number");
      toast.error("Staff ID must be a number");
      setIsLoading(false);
      return;
    }

    try {
      const user = await register(name, email, password, role, Deptid, staffId, username);

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
      setError(err.message || "Registration failed");
      toast.error(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join your workspace</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center mb-6">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <InputField
            label="Full Name"
            type="text"
            icon={User}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
          />
          <InputField
            label="Username"
            type="text"
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
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
            placeholder="Enter your password (min 6 chars)"
          />
          <InputField
            label="Staff ID"
            type="text"
            icon={Briefcase}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            placeholder="Enter staff ID (optional)"
            required={false}
          />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full py-3.5 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Department</label>
            <select
              value={Deptid}
              onChange={(e) => setDeptid(e.target.value)}
              className="w-full py-3.5 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
              required
            >
              <option value="">Select Department</option>
              {departments.length > 0 ? (
                departments.map((dept) => (
                  <option key={dept.Deptid} value={dept.Deptid}>
                    {dept.Deptname} ({dept.deptCode})
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No departments available
                </option>
              )}
            </select>
          </div>
          <button
            type="submit"
            disabled={isLoading || !departments.length}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Registering...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Register</span>
                <ArrowRight size={20} />
              </div>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Register;