import React from 'react';
import { Users, BookOpen, UserPlus, Trash2, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';

const StaffCard = ({
  staff,
  handleStaffClick,
  toggleCourses,
  expandedCourses,
  handleViewStudents,
  setSelectedStaff,
  setSelectedStaffCourse,
  setSelectedSectionId,
  setShowEditBatchModal,
  setOperationFromModal,
  handleRemoveCourse,
  setShowAllocateCourseModal,
}) => {
  return (
    <div
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 min-h-[200px] h-fit flex-shrink-0"
      onClick={() => handleStaffClick(staff)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{staff.name}</h3>
            <p className="text-gray-500 text-sm">ID: {staff.staffId}</p>
          </div>
          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-semibold">
            {staff.allocatedCourses.length} Courses
          </span>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Users size={16} className="mr-2 text-indigo-500" />
            <span>Department: {staff.departmentName}</span>
          </div>
        </div>
        <div className="mb-4">
          <div
            className="flex items-center justify-between text-sm font-semibold text-gray-700 cursor-pointer hover:text-indigo-600 transition-colors duration-200"
            onClick={e => { e.stopPropagation(); toggleCourses(staff.staffId); }}
          >
            <span>Allocated Courses</span>
            {expandedCourses.includes(staff.staffId) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {expandedCourses.includes(staff.staffId) && (
            <div className="mt-4 space-y-4 max-h-96 overflow-y-auto transition-all duration-300">
              {staff.allocatedCourses.length > 0 ? (
                staff.allocatedCourses.map(course => (
                  <div
                    key={course.id}
                    className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-600 font-bold text-sm">{course.courseCode.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">{course.courseCode}</h4>
                            <p className="text-xs text-gray-600 truncate">{course.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700">
                          Section: {course.batch}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700">
                          Semester: {course.semester}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700">
                          Batch: {course.year}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); handleViewStudents(course.courseCode, course.sectionId); }}
                          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border border-indigo-100"
                          title="View Students"
                        >
                          <Users size={12} />
                          <span className="truncate">Students</span>
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedStaff(staff);
                            setSelectedStaffCourse(course);
                            setSelectedSectionId(course.sectionId);
                            setShowEditBatchModal(true);
                            setOperationFromModal(false);
                          }}
                          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border border-amber-100"
                          title="Edit Section"
                        >
                          <Edit2 size={12} />
                          <span className="truncate">Edit Section</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveCourse(staff, course.id); }}
                          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border border-red-100"
                          title="Remove Course"
                        >
                          <Trash2 size={12} />
                          <span className="truncate">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BookOpen size={20} className="text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 font-semibold">No courses allocated</p>
                    <p className="text-xs text-gray-500 mt-1">Assign courses to this staff member</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            setSelectedStaff(staff);
            setShowAllocateCourseModal(true);
            setOperationFromModal(false);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-1 w-full justify-center"
        >
          <UserPlus size={16} />
          Allocate Course
        </button>
      </div>
    </div>
  );
};

export default StaffCard;