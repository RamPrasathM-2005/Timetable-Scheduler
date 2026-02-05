import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Plus,
  Settings,
  BarChart3,
  Clock,
  UserPlus,
  BookPlus,
  CalendarPlus,
  UserCog,
  FileText,
  TrendingUp,
  Eye,
  Edit,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { api, getCurrentUser } from '../../services/authService';

const AdminDashboard = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalSemesters: 0,
    totalCourses: 0,
    totalStaff: 3,
    totalStudents: 105,
    recentSemesters: [],
    recentCourses: []
  });

  const allActions = [
    { name: "Create Semester", icon: <CalendarPlus className="w-4 h-4" />, action: () => navigateTo("manage-semesters") },
    { name: "View Semesters", icon: <Eye className="w-4 h-4" />, action: () => navigateTo("manage-semesters") },
    { name: "Edit Semester", icon: <Edit className="w-4 h-4" />, action: () => navigateTo("manage-semesters") },
    { name: "Create Course", icon: <BookPlus className="w-4 h-4" />, action: () => navigateTo("manage-courses") },
    { name: "View Courses", icon: <Eye className="w-4 h-4" />, action: () => navigateTo("manage-courses") },
    { name: "Allocate Course", icon: <Settings className="w-4 h-4" />, action: () => navigateTo("manage-courses") },
    { name: "Add Staff", icon: <UserPlus className="w-4 h-4" />, action: () => navigateTo("manage-staff") },
    { name: "View Staff", icon: <Eye className="w-4 h-4" />, action: () => navigateTo("manage-staff") },
    { name: "Allocate Staff", icon: <UserCog className="w-4 h-4" />, action: () => navigateTo("manage-staff") },
    { name: "Add Student", icon: <UserPlus className="w-4 h-4" />, action: () => navigateTo("manage-students") },
    { name: "View Students", icon: <Eye className="w-4 h-4" />, action: () => navigateTo("manage-students") },
    { name: "Allocate Students", icon: <Settings className="w-4 h-4" />, action: () => navigateTo("manage-students") }
  ];

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const user = getCurrentUser();
      console.log(token);
      console.log(user);
      if (!token || !user) {
        console.log('No token or user found, redirecting to login');
        navigate('/login');
        return;
      }

      try {
        const semestersResponse = await api.get('/admin/semesters');
        const semesters = semestersResponse.data.data || [];

        const sortedSemesters = semesters.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const recentSemesters = sortedSemesters.slice(0, 3).map(sem => ({
          id: sem.semesterId,
          name: `${sem.degree} ${sem.branch} Sem ${sem.semesterNumber}`,
          batch: sem.batch
        }));

        const coursesResponse = await api.get('/admin/courses');
        const courses = coursesResponse.data.data || [];

        const recentCourses = courses.slice(-3).map(course => ({
          id: course.courseId,
          name: course.courseTitle,
          code: course.courseCode
        }));

        setDashboardData(prev => ({
          ...prev,
          totalSemesters: semesters.length,
          totalCourses: courses.length,
          recentSemesters,
          recentCourses
        }));
      } catch (error) {
        console.error('Error fetching dashboard data:', error.response?.data || error.message);
        if (error.response?.status === 401) {
          console.log('Unauthorized, redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isScrolling) {
        setScrollPosition(prev => {
          const maxScroll = allActions.length * 116;
          if (prev >= maxScroll) {
            return 0;
          }
          return prev + 1;
        });
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isScrolling, allActions.length]);

  const navigateTo = (page) => {
    console.log(`Navigating to: ${page}`);
    navigate(`/admin/${page}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your institution efficiently</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Semesters</p>
              <p className="text-xl font-bold text-gray-800">{dashboardData.totalSemesters}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
          <div className="flex items-center">
            <BookOpen className="w-6 h-6 text-blue-400 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Courses</p>
              <p className="text-xl font-bold text-gray-800">{dashboardData.totalCourses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-slate-500">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-slate-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Staff</p>
              <p className="text-xl font-bold text-gray-800">{dashboardData.totalStaff}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-500">
          <div className="flex items-center">
            <GraduationCap className="w-6 h-6 text-gray-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Students</p>
              <p className="text-xl font-bold text-gray-800">{dashboardData.totalStudents}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Management Options</h3>
          <button
            onClick={() => setIsScrolling(!isScrolling)}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 transition-colors"
          >
            {isScrolling ? '⏸️ Pause' : '▶️ Play'}
          </button>
        </div>
        <div className="overflow-hidden relative bg-gray-50 rounded-lg p-2" style={{ height: '120px' }}>
          <div 
            className="flex gap-3 absolute top-2 left-2"
            style={{ 
              transform: `translateX(-${scrollPosition}px)`,
              transition: 'transform 0.1s linear'
            }}
          >
            {[...allActions, ...allActions, ...allActions].map((action, index) => (
              <button
                key={`action-${index}`}
                onClick={() => {
                  setIsScrolling(false);
                  action.action();
                }}
                className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm"
                style={{ 
                  minWidth: '100px',
                  maxWidth: '100px',
                  height: '100px',
                  flexShrink: 0
                }}
              >
                <div className="text-blue-600 mb-2">
                  {action.icon}
                </div>
                <span className="text-xs text-center text-gray-700 font-medium leading-tight">
                  {action.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigateTo("manage-semesters")}
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CalendarPlus className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">New Semester</span>
            </button>
            <button
              onClick={() => navigateTo("manage-courses")}
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookPlus className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">New Course</span>
            </button>
            <button
              onClick={() => navigateTo("manage-staff")}
              className="flex items-center justify-center p-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <UserCog className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Staff Allocation</span>
            </button>
            <button
              onClick={() => navigateTo("manage-students")}
              className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Student Allocation</span>
            </button>
            <button
              onClick={() => navigateTo("timetable")}
              className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Timetable</span>
            </button>
            <button
              onClick={() => navigateTo("reports")}
              className="flex items-center justify-center p-4 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Reports</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-semibold text-gray-800">Recent Semesters</h4>
            </div>
            <div className="space-y-2">
              {dashboardData.recentSemesters.map((semester) => (
                <div key={semester.id} className="p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800 text-xs">{semester.name}</p>
                      <span className="text-xs text-gray-600">{semester.batch}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-semibold text-gray-800">Recent Courses</h4>
            </div>
            <div className="space-y-2">
              {dashboardData.recentCourses.map((course) => (
                <div key={course.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800 text-xs">{course.name}</p>
                      <span className="text-xs text-blue-600">{course.code}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">System Status</h4>
            <div className="space-y-2">
              <div className="flex items-center text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-700">Database Online</span>
              </div>
              <div className="flex items-center text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-700">Services Active</span>
              </div>
              <div className="flex items-center text-xs">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                <span className="text-gray-700">Sync: 98%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;