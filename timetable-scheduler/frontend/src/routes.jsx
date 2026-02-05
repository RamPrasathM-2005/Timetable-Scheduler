import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated, getUserRole } from "./utils/auth.js";

// Layouts
import AdminLayout from "./layouts/AdminLayout";


// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageSemesters from './pages/admin/ManageSemesters/ManageSemsters';
import ManageCourses from './pages/admin/ManageCourses/ManageCourses';
import ManageStaff from './pages/admin/ManageStaffs/ManageStaff';
import Timetable from './pages/admin/Timetable';
import ManageRegulations from './pages/admin/ManageRegulations';
import CourseRecommendation from './pages/admin/CourseRecommendation';
import BatchRegulationAllocation from './pages/admin/BatchRegulationAllocation';

// NotFound
import NotFound from "./pages/NotFound";
// import StudentStaffMapping from "./pages/admin/StudentEnrollmentsView";
//  import StudentEnrollmentsView from "./pages/admin/StudentEnrollmentsView";

// ProtectedRoute
const ProtectedRoute = ({ children, role }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (role && getUserRole() !== role.toLowerCase()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const routes = [
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password/:token", element: <ResetPassword /> },
  {
    path: "/admin",
    element: (
      <ProtectedRoute role="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'manage-semesters', element: <ManageSemesters /> },
      { path: 'manage-regulations', element: <ManageRegulations /> },
      { path: 'manage-batches', element: <BatchRegulationAllocation /> },
      { path: 'manage-courses', element: <ManageCourses /> },
      { path: 'manage-staff', element: <ManageStaff /> },
      { path: 'timetable', element: <Timetable /> },

      { path: 'course-recommendation', element: <CourseRecommendation /> },
    ]
  },
  { path: "*", element: <NotFound /> },
];

export default routes;
