import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService';

const API_BASE = 'http://localhost:4000/api/admin';

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
            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl focus:ring-4 focus:ring-blue-100 transition-all shadow-md flex items-center gap-2
              ${saveDisabled ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
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
  newBatchForm,
  setNewBatchForm,
  handleAddBatch,
  setShowAddBatchModal,
  setShowCourseDetailsModal,
  setSections,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setShowAddBatchModal(false);
    setShowCourseDetailsModal(true);
    setNewBatchForm({ numberOfBatches: 1 });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!selectedCourse?.courseId) {
      toast.error('No course selected');
      return;
    }
    const numberOfBatches = parseInt(newBatchForm.numberOfBatches);
    if (isNaN(numberOfBatches) || numberOfBatches < 1) {
      toast.error('Number of batches must be a positive integer');
      return;
    }

    setIsSubmitting(true);

    // Optimistic update
    const optimisticBatches = {};
    for (let i = 1; i <= numberOfBatches; i++) {
      optimisticBatches[`Batch ${i}`] = [];
    }
    setSections(prev => {
      const newState = {
        ...prev,
        [String(selectedCourse.courseId)]: {
          ...(prev[String(selectedCourse.courseId)] || {}),
          ...optimisticBatches,
        },
      };
      return newState;
    });

    try {
      const response = await Promise.race([
        api.post(`${API_BASE}/courses/${selectedCourse.courseId}/sections`, {
          numberOfSections: numberOfBatches,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
      ]);

      if (response.data.status !== 'success' || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from server');
      }

      const newSections = response.data.data;
      
      const updatedBatches = newSections.reduce((acc, section) => {
        if (section.sectionName) {
          const normalizedName = section.sectionName.replace('BatchBatch', 'Batch');
          acc[normalizedName] = [];
        }
        return acc;
      }, {});

      setSections(prev => {
        const newState = {
          ...prev,
          [String(selectedCourse.courseId)]: {
            ...(prev[String(selectedCourse.courseId)] || {}),
            ...updatedBatches,
          },
        };
        return newState;
      });

      toast.success(`Added ${newSections.length} batch${newSections.length > 1 ? 'es' : ''} successfully`);
      await handleAddBatch(); 
      handleClose();

    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error adding batches';
      toast.error(message);
      
      // Revert optimistic update on error
      setSections(prev => {
        const newState = { ...prev };
        const currentBatches = newState[String(selectedCourse.courseId)] || {};
        for (let i = 1; i <= numberOfBatches; i++) {
          delete currentBatches[`Batch ${i}`];
        }
        newState[String(selectedCourse.courseId)] = currentBatches;
        return newState;
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      title="Add Batches"
      onClose={handleClose}
      onSave={handleSubmit}
      saveText={isSubmitting ? 'Adding...' : 'Generate Batches'}
      saveDisabled={isSubmitting}
    >
      <div className="space-y-6">
        
        {/* Context Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
           <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
             <Layers className="w-5 h-5" />
           </div>
           <div>
             <h4 className="font-bold text-slate-800 text-sm">Course Target</h4>
             <p className="text-sm text-slate-600 font-medium">{selectedCourse?.courseCode} - {selectedCourse?.courseTitle}</p>
           </div>
        </div>

        {/* Input Area */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Number of Batches to Create <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={newBatchForm.numberOfBatches}
            onChange={(e) => {
              const value = e.target.value;
              setNewBatchForm({ numberOfBatches: value === '' ? '' : parseInt(value) || 1 });
            }}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none text-lg font-bold text-slate-900 transition-all"
            required
            disabled={isSubmitting}
            placeholder="1"
          />
        </div>

        {/* Info Box */}
        <div className="flex gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-slate-400" />
          <p>
            Batches will be named sequentially (e.g., Batch 1, Batch 2). You can allocate staff to these batches after creation.
          </p>
        </div>

      </div>
    </ModalWrapper>
  );
};

export default AddBatchModal;