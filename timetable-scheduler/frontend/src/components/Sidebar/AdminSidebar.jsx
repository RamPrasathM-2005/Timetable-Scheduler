import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../services/authService';

import {
  Book,
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  GitMerge,
  Library,
  UserCheck,
  Users,
  CalendarClock,
  Calculator,
  BarChart3,
  Sparkles,
  ClipboardCheck,
  FilePieChart,
  FileSearch,
  Network,
  Award,
  MessageSquarePlus,
  MousePointerClick,
  Info,
  ListChecks,
  X,      
  LogOut,  
  Menu,
  BookA     
} from "lucide-react";

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const sidebarItems = [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/manage-semesters", icon: CalendarDays, label: "Manage Semesters" },
    { to: "/admin/manage-regulations", icon: ShieldCheck, label: "Manage Regulations" },
    { to: "/admin/manage-batches", icon: GitMerge, label: "Allocate Regulation to Batch" },
    { to: "/admin/manage-courses", icon: Library, label: "Manage Courses" },
    { to: "/admin/manage-staff", icon: UserCheck, label: "Allocate Staff to Course" },
    { to: "/admin/timetable", icon: CalendarClock, label: "Timetable" },
    { to: "/admin/labtimetable", icon: CalendarClock, label: "Lab Timetable"},
    { to: "/admin/labcreation", icon: CalendarClock, label: "Lab Creation"},
    { to: "/admin/course-recommendation", icon: Sparkles, label: "Course Recommendation" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsOpen(false);
  };

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {isOpen && (
        <div 
          className="fixed inset-0 backdrop-blur-sm z-40 lg:hidden bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50
        w-64 bg-[#11101d] text-white
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col shadow-2xl font-sans
      `}>
        
        <div className="flex items-center justify-between h-20 px-6 border-b border-[#1d1b31] shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
            <span className="text-xl font-bold tracking-wide">Admin Panel</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            {/* This was causing the error because X wasn't imported */}
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3">
          <ul className="space-y-1.5">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={index}>
                  <NavLink
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
                      text-sm font-medium leading-relaxed
                      ${isActive 
                        ? 'bg-white text-[#11101d] shadow-md transform scale-[1.02]' 
                        : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
            
            <li className="pt-4 mt-2 border-t border-[#1d1b31]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-4 px-4 py-3 rounded-xl w-full text-left 
                           text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
              >
                {/* This was also missing from imports */}
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {!isOpen && (
        <button
          className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-[#11101d] text-white shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          {/* This was also missing from imports */}
          <Menu className="w-6 h-6" />
        </button>
      )}
    </>
  );
};

export default AdminSidebar;