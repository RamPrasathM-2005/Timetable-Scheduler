import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { branchMap } from './branchMap';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService';
import CourseCard from './CourseCard';
import CourseForm from './CourseForm';

const API_BASE = 'http://localhost:4000/api/admin';

const SemesterDetails = ({ semester, onBack, onDelete, onRefresh }) => {
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingCourses, setDeletingCourses] = useState(new Set());
  const [updateKey, setUpdateKey] = useState(0); // Force re-render after optimistic update

  useEffect(() => {
    fetchCourses();
  }, [semester.semesterId]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`${API_BASE}/semesters/${semester.semesterId}/courses`);
      console.log(`SemesterDetails: Fetched courses for semester ${semester.semesterId}:`, data.data);
      setCourses(data.data || []);
      setUpdateKey(prev => prev + 1); // Force re-render
    } catch (err) {
      console.error(`SemesterDetails: Error fetching courses for semester ${semester.semesterId}:`, err.response?.data || err);
      if (err.response?.status !== 404) {
        toast.error('Failed to fetch courses');
      }
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setShowForm(true);
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    // Optimistic update
    const courseToDelete = courses.find(c => c.courseId === courseId);
    setCourses(prev => prev.filter(c => c.courseId !== courseId));
    setDeletingCourses(prev => new Set([...prev, courseId]));
    setUpdateKey(prev => prev + 1); // Force immediate re-render
    console.log(`SemesterDetails: Optimistically removed course ${courseId} from UI`);

    try {
      const response = await Promise.race([
        api.delete(`${API_BASE}/courses/${courseId}`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
      ]);
      console.log(`SemesterDetails: Successfully deleted course ${courseId}:`, response.data);
      toast.success('Course deleted successfully');
      await fetchCourses(); // Ensure consistency with backend
      onRefresh(semester.semesterId, true); // Notify parent of course deletion
    } catch (err) {
      console.error(`SemesterDetails: Error deleting course ${courseId}:`, err.response?.data || err);
      // Revert optimistic update
      if (courseToDelete) {
        setCourses(prev => [...prev, courseToDelete].sort((a, b) => a.courseId - b.courseId));
        setUpdateKey(prev => prev + 1); // Force re-render
      }
      const message = err.response?.data?.message || err.message || 'Failed to delete course';
      if (message.includes('foreign key constraint')) {
        toast.error('Cannot delete course because it has associated sections or staff allocations. Please remove them first.');
      } else {
        toast.error(message);
      }
    } finally {
      setDeletingCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
    }
  };

  const displayBranch = branchMap[semester.branch] || semester.branch;

  return (
    <div key={updateKey}>
      <div className="flex items-center gap-4 mb-6 relative">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-lg">
          <ChevronRight className="w-5 h-5 text-gray-600 transform rotate-180" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">{displayBranch} - Semester {semester.semesterNumber}</h2>
          <p className="text-gray-600">Degree: {semester.degree} | Batch: {semester.batch} ({semester.batchYears})</p>
        </div>
        <button onClick={() => onDelete(semester.semesterId)} className="p-2 hover:bg-red-100 rounded">
          <Trash2 className="w-5 h-5 text-red-600" />
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Courses ({courses.length})</h3>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingCourse(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Course
          </button>
        </div>
        {loading ? (
          <p>Loading courses...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <CourseCard
                key={c.courseId}
                course={c}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDeleting={deletingCourses.has(c.courseId)}
              />
            ))}
            {courses.length === 0 && (
              <div className="text-center py-8 col-span-full">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No courses added yet</p>
              </div>
            )}
          </div>
        )}
      </div>
      <CourseForm
        isOpen={showForm || !!editingCourse}
        onClose={() => {
          setShowForm(false);
          setEditingCourse(null);
          fetchCourses();
        }}
        semesterId={semester.semesterId}
        course={editingCourse}
        onRefresh={fetchCourses}
      />
    </div>
  );
};

export default SemesterDetails;