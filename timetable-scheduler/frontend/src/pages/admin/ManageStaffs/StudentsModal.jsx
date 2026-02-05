import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, User, Hash, Calendar, GraduationCap } from 'lucide-react';

// --- Reusable Modern Modal Wrapper ---
const ModalWrapper = ({ title, children, onClose, width = "max-w-lg" }) => {
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return createPortal(
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
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const StudentsModal = ({ selectedCourseCode, selectedCourseStudents, setShowStudentsModal }) => {
  
  const handleClose = () => {
    setShowStudentsModal(false);
  };

  return (
    <ModalWrapper
      title="Enrolled Students"
      onClose={handleClose}
      width="max-w-xl"
    >
      <div className="space-y-6">
        
        {/* Context Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
               <GraduationCap className="w-5 h-5" />
             </div>
             <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Target Course</p>
               <p className="text-base font-bold text-slate-900">{selectedCourseCode}</p>
             </div>
           </div>
           <div className="text-right">
             <p className="text-2xl font-bold text-slate-800">{selectedCourseStudents.length}</p>
             <p className="text-xs text-slate-500 font-medium">Total Students</p>
           </div>
        </div>

        {/* Students List */}
        <div className="space-y-3">
          {selectedCourseStudents.length > 0 ? (
            selectedCourseStudents.map((student, index) => (
              <div 
                key={student.rollnumber || index} 
                className="group bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex items-center gap-4"
              >
                {/* Avatar / Initials */}
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                   {(student.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">{student.name || 'Unknown Name'}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      <Hash className="w-3 h-3" /> {student.rollnumber || 'N/A'}
                    </span>
                    {student.batch && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <Calendar className="w-3 h-3" /> {student.batch}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                 <Users className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-900 font-semibold">No students found</p>
              <p className="text-slate-500 text-sm mt-1">
                There are currently no students enrolled in this section.
              </p>
            </div>
          )}
        </div>

      </div>
    </ModalWrapper>
  );
};

export default StudentsModal;