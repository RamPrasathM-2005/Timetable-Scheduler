import React from "react";

const Navbar = () => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <button className="bg-red-500 px-4 py-2 rounded-lg text-white hover:bg-red-600">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;
