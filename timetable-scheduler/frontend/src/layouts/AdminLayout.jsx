import React from "react";
import AdminSidebar from "../components/Sidebar/AdminSidebar";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="lg:ml-64 flex-1 p-2 bg-gray-100 min-h-screen">  
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
