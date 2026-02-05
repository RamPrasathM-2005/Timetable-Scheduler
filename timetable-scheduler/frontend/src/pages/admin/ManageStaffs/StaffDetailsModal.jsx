import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Users, Edit2, Trash2, UserPlus, Mail, Building, Hash, GraduationCap, Calendar, Layers } from 'lucide-react';

// --- Reusable Modern Modal Wrapper ---
const ModalWrapper = ({ title, children, onClose, onSave, saveText = "Save", saveIcon: SaveIcon, width = "max-w-xl" }) => {
  useEffect(() => {
    // 1. Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return createPortal(
    <>
      {/* 
         FIX: This style tag forces React-Toastify to appear ABOVE the modal.
         The Modal is z-9999, so we set Toastify to z-100000 
      */}
      <style>{`
        .Toastify__toast-container {
          z-index: 100000 !important;
        }
      `}</style>

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
        <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white rounded-t-2xl z-10">
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
            {children}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
            >
              Close
            </button>
            <button
              onClick={onSave}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl focus:ring-4 focus:ring-indigo-100 transition-all shadow-md flex items-center gap-2 hover:shadow-lg"
            >
              {SaveIcon && <SaveIcon className="w-4 h-4" />}
              {saveText}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

const StaffDetailsModal = ({
  selectedStaff,
  setShowStaffDetailsModal,
  handleViewStudents,
  setSelectedStaffCourse,
  setSelectedSectionId,
  setShowEditBatchModal,
  setOperationFromModal,
  handleRemoveCourse,
  setShowAllocateCourseModal,
}) => {

  const handleClose = () => {
    setShowStaffDetailsModal(false);
  };

  const handleAllocateClick = () => {
    setShowStaffDetailsModal(false);
    setShowAllocateCourseModal(true);
    setOperationFromModal(true);
  };

  return (
    <ModalWrapper
      title="Staff Profile & Allocations"
      onClose={handleClose}
      onSave={handleAllocateClick}
      saveText="Allocate New Course"
      saveIcon={UserPlus}
      width="max-w-2xl"
    >
      <div className="space-y-6">
        
        {/* Staff Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
              {selectedStaff.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedStaff.name}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {selectedStaff.staffId}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
                <p className="text-sm font-medium text-slate-800 break-all">{selectedStaff.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Department</p>
                <p className="text-sm font-medium text-slate-800">{selectedStaff.departmentName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Allocated Courses Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               Allocated Courses 
               <span className="text-sm font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                 {selectedStaff.allocatedCourses.length}
               </span>
             </h3>
          </div>

          <div className="space-y-3">
            {selectedStaff.allocatedCourses.length > 0 ? (
              selectedStaff.allocatedCourses.map(course => (
                <div
                  key={course.id}
                  className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Course Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{course.courseCode}</h4>
                        <p className="text-sm text-slate-600 font-medium">{course.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4 pl-[52px]">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                       <Layers className="w-3 h-3" /> Section {course.batch}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
                       <GraduationCap className="w-3 h-3" /> Sem {course.semester}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-100">
                       <Calendar className="w-3 h-3" /> Batch {course.year}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 pl-[52px]">
                    <button
                      onClick={() => handleViewStudents(course.courseCode, course.sectionId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Users size={14} /> View Students
                    </button>
                    
                    <div className="w-px h-4 bg-slate-200"></div>

                    <button
                      onClick={() => {
                        setSelectedStaffCourse(course);
                        setSelectedSectionId(course.sectionId);
                        setShowEditBatchModal(true);
                        setOperationFromModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Edit2 size={14} /> Edit Section
                    </button>

                    <div className="w-px h-4 bg-slate-200"></div>

                    <button
                      onClick={() => handleRemoveCourse(selectedStaff, course.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-900 font-semibold">No courses allocated</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  This staff member hasn't been assigned to any courses yet.
                </p>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </ModalWrapper>
  );
};

export default StaffDetailsModal;