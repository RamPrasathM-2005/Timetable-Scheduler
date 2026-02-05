import React from 'react';
import { BookOpen, Calendar, Users, Settings, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService'; // Adjust path if needed

const API_BASE = 'http://localhost:4000/api/admin';

const CourseCard = ({ course, sections, getCourseTypeColor, handleCourseClick, handleDeleteCourse, openEditModal }) => {
  const sem = course.semesterDetails;
  const numBatches = sections[String(course.courseId)] ? Object.keys(sections[String(course.courseId)]).length : 0;
  console.log(`CourseCard: Sections for course ${course.courseId}:`, sections[String(course.courseId)]); // Debug log

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`${API_BASE}/courses/${course.courseId}`);
      toast.success('Course deleted successfully');
      handleDeleteCourse(course.courseId);
    } catch (err) {
      const message = err.response?.data?.message || 'Error deleting course';
      toast.error(message);
      if (message.includes('Unknown column')) {
        toast.warn('Database configuration issue detected. Please check server settings.');
      }
    }
  };

  return (
    <div
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden cursor-pointer border-2 border-gray-200"
      onClick={() => handleCourseClick(course)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{course.courseCode}</h3>
            <p className="text-gray-600 text-sm line-clamp-2">{course.courseTitle}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCourseTypeColor(course.type)}`}>
            {course.type}
          </span>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <BookOpen size={16} className="mr-2" />
            <span>Credits: {course.credits}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar size={16} className="mr-2" />
            <span>Semester: {sem ? ` ${sem.semesterNumber} (${sem.branch})` : 'N/A'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Users size={16} className="mr-2" />
            <span>{numBatches} Batches</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Settings size={16} className="mr-2" />
            <span>Category: {course.category}</span>
          </div>
        </div>
        <div className="flex justify-between">
          <button
            onClick={handleDelete}
            className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(course); }}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <Edit3 size={16} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;