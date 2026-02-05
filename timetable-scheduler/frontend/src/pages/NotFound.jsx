import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-5xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">Page Not Found</p>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => navigate("/login")}
      >
        Go to Login
      </button>
    </div>
  );
};

export default NotFound;
