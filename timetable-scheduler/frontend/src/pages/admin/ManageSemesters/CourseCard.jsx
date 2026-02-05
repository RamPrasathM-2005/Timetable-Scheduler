import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

const CourseCard = ({ course, onEdit, onDelete, isDeleting }) => (
  <div className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group">
    <div className="flex justify-between items-start mb-2">
      <span className="font-semibold text-blue-600">{course.courseCode}</span>
      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">{course.type}</span>
    </div>
    <h4 className="font-medium text-gray-800 mb-2">{course.courseTitle}</h4>
    <div className="text-sm text-gray-600 mb-4">Credits: {course.credits} | Category: {course.category}</div>
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(course);
        }}
        className="p-2 hover:bg-yellow-100 rounded text-sm flex items-center gap-1"
        disabled={isDeleting}
      >
        <Edit className="w-4 h-4 text-yellow-600" />
        Edit
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(course.courseId);
        }}
        className="p-2 hover:bg-red-100 rounded text-sm flex items-center gap-1"
        disabled={isDeleting}
      >
        <Trash2 className="w-4 h-4 text-red-600" />
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  </div>
);

export default CourseCard;