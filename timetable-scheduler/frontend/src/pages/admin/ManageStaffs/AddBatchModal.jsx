import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, AlertCircle } from 'lucide-react';

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

const AddBatchModal = ({
  selectedCourse,
  setShowAddBatchModal,
  newBatchForm,
  setNewBatchForm,
  handleAddBatch,
  setShowAllocateCourseModal,
  operationLoading,
}) => {

  const handleClose = () => {
    setShowAddBatchModal(false);
    setShowAllocateCourseModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAddBatch(e);
  };

  return (
    <ModalWrapper
      title="Add Sections"
      onClose={handleClose}
      onSave={handleSubmit}
      saveText={operationLoading ? 'Processing...' : 'Add Sections'}
      saveDisabled={operationLoading}
    >
      <div className="space-y-6">
        
        {/* Context Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
           <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
             <Layers className="w-5 h-5" />
           </div>
           <div>
             <h4 className="font-bold text-slate-800 text-sm">Target Course</h4>
             <p className="text-sm text-slate-600 font-medium">
               {selectedCourse?.code || selectedCourse?.courseCode} - {selectedCourse?.title || selectedCourse?.courseTitle}
             </p>
           </div>
        </div>

        {/* Input Area */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Number of Sections to Create <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={newBatchForm.numberOfBatches}
            onChange={(e) => setNewBatchForm({ numberOfBatches: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none text-lg font-bold text-slate-900 transition-all"
            required
            disabled={operationLoading}
            placeholder="e.g. 2"
          />
        </div>

        {/* Info Box */}
        <div className="flex gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-slate-400" />
          <p>
            Sections will be generated sequentially. You can allocate staff to these sections immediately after creation.
          </p>
        </div>

      </div>
    </ModalWrapper>
  );
};

export default AddBatchModal;