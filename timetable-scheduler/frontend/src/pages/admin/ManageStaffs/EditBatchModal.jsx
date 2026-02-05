import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, User, Check, AlertCircle } from 'lucide-react';

// --- Reusable Modern Modal Wrapper ---
const ModalWrapper = ({ title, children, onClose, onSave, saveText = "Save", saveDisabled = false, width = "max-w-md" }) => {
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
            disabled={saveDisabled}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
            disabled={saveDisabled}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saveDisabled}
            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl focus:ring-4 focus:ring-indigo-100 transition-all shadow-md flex items-center gap-2
              ${saveDisabled ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'}`}
          >
            {saveText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const EditBatchModal = ({
  selectedStaffCourse,
  selectedStaff,
  setShowEditBatchModal,
  setSelectedStaffCourse,
  setSelectedSectionId,
  selectedSectionId,
  handleEditBatch,
  setShowStaffDetailsModal,
  operationFromModal,
  courses,
  operationLoading,
}) => {
  
  const course = courses.find(c => c.code === selectedStaffCourse.courseCode);

  const handleClose = () => {
    setShowEditBatchModal(false);
    setSelectedStaffCourse(null);
    setSelectedSectionId('');
    if (operationFromModal) setShowStaffDetailsModal(true);
  };

  const handleSave = () => {
    handleEditBatch();
  };

  return (
    <ModalWrapper
      title="Edit Allocation"
      onClose={handleClose}
      onSave={handleSave}
      saveText={operationLoading ? 'Processing...' : 'Update Section'}
      saveDisabled={!selectedSectionId || operationLoading}
    >
      <div className="space-y-6">
        
        {/* Context Info */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
           {/* Course Info */}
           <div className="flex items-start gap-3">
             <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 mt-0.5">
               <Layers className="w-4 h-4" />
             </div>
             <div>
               <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Target Course</h4>
               <p className="text-sm font-medium text-slate-700">{selectedStaffCourse.courseCode}</p>
             </div>
           </div>
           
           {/* Divider */}
           <div className="h-px bg-indigo-200/60 w-full"></div>

           {/* Staff Info */}
           <div className="flex items-start gap-3">
             <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 mt-0.5">
               <User className="w-4 h-4" />
             </div>
             <div>
               <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Staff Member</h4>
               <p className="text-sm font-medium text-slate-700">{selectedStaff?.name || 'Unknown Staff'}</p>
             </div>
           </div>
        </div>

        {/* Section Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Select New Section
          </label>
          
          <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
            {course && course.sections.length > 0 ? (
              course.sections.map(section => {
                const isSelected = selectedSectionId === section.sectionId;
                return (
                  <button
                    key={section.sectionId}
                    onClick={() => setSelectedSectionId(section.sectionId)}
                    disabled={operationLoading}
                    className={`relative px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border flex items-center justify-center gap-2
                      ${isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                  >
                    {section.sectionName}
                    {isSelected && <Check className="w-4 h-4 absolute right-3" />}
                  </button>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                 <p className="text-slate-500 text-sm">No sections available.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </ModalWrapper>
  );
};

export default EditBatchModal;