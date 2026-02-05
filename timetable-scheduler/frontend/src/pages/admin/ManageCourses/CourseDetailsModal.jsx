import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, Plus, UserPlus, Trash2, Layers, BookOpen, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService';

const API_BASE = 'http://localhost:4000/api/admin';

// --- Reusable Modern Modal Wrapper ---
const ModalWrapper = ({ title, children, onClose, onSave, saveText = "Save", showFooter = false, width = "max-w-2xl" }) => {
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

        {/* Footer (Optional) */}
        {showFooter && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const CourseDetailsModal = ({
  selectedCourse,
  sections,
  fetchingSections,
  setShowCourseDetailsModal,
  setSections,
  openEditModal,
  setShowAddBatchModal,
  handleDeleteBatch,
  handleEditStaff,
  handleDeleteStaff,
  setSelectedBatch,
  setShowAllocateStaffModal,
}) => {
  const [deletingBatches, setDeletingBatches] = useState(new Set());

  const handleClose = () => {
    setShowCourseDetailsModal(false);
  };

  const onDeleteBatch = async (courseId, sectionName) => {
    if (!confirm(`Delete batch ${sectionName}? This action cannot be undone.`)) return;

    const normalizedName = sectionName.replace('BatchBatch', 'Batch');
    setDeletingBatches(prev => new Set([...prev, normalizedName]));

    // Optimistic update
    setSections(prev => {
      const updatedBatches = { ...prev[String(courseId)] };
      delete updatedBatches[normalizedName];
      const newState = { ...prev, [String(courseId)]: updatedBatches };
      return newState;
    });

    try {
      await Promise.race([
        api.delete(`${API_BASE}/courses/${courseId}/sections/${sectionName}`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
      ]);
      toast.success('Batch deleted successfully');
      await handleDeleteBatch(courseId, sectionName); // Trigger refetch
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error deleting batch';
      console.error(`CourseDetailsModal: Error deleting batch ${sectionName}:`, err.response?.data || err);
      toast.error(message);
      
      // Revert optimistic update
      setSections(prev => {
        const newState = {
          ...prev,
          [String(courseId)]: {
            ...(prev[String(courseId)] || {}),
            [normalizedName]: [],
          },
        };
        return newState;
      });
    } finally {
      setDeletingBatches(prev => {
        const newSet = new Set(prev);
        newSet.delete(normalizedName);
        return newSet;
      });
    }
  };

  const onDeleteStaff = async (staffCourseId) => {
    if (!confirm('Remove this staff from the batch?')) return;
    try {
      await api.delete(`${API_BASE}/staff-courses/${staffCourseId}`);
      toast.success('Staff removed successfully');
      await handleDeleteStaff(staffCourseId);
    } catch (err) {
      const message = err.response?.data?.message || 'Error removing staff';
      toast.error(message);
    }
  };

  const hasBatches = sections[selectedCourse.courseId] && Object.keys(sections[selectedCourse.courseId]).length > 0;

  return (
    <ModalWrapper
      title={`${selectedCourse.courseCode} Details`}
      onClose={handleClose}
      showFooter={false}
    >
      <div className="space-y-8">
        
        {/* Course Info Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
               <BookOpen className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedCourse.courseTitle}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2">
                   <span>{selectedCourse.courseCode}</span>
                   <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                   <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 border border-slate-200">{selectedCourse.type}</span>
                </p>
             </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                openEditModal(selectedCourse);
                setShowCourseDetailsModal(false);
              }}
              className="flex-1 sm:flex-none justify-center bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-sm"
            >
              <Edit3 size={16} />
              Edit
            </button>
            <button
              onClick={() => {
                setShowAddBatchModal(true);
                setShowCourseDetailsModal(false);
              }}
              className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={16} />
              Add Batch
            </button>
          </div>
        </div>

        {/* Batches List */}
        <div>
           <div className="flex items-center gap-2 mb-4">
             <Layers className="w-5 h-5 text-slate-400" />
             <h3 className="text-lg font-bold text-slate-800">
               Active Batches <span className="text-sm font-normal text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">{hasBatches ? Object.keys(sections[selectedCourse.courseId]).length : 0}</span>
             </h3>
           </div>
           
           <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {fetchingSections ? (
              <div className="flex justify-center py-8 text-slate-500 text-sm">Loading batches...</div>
            ) : !hasBatches ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 <p className="text-slate-500 font-medium">No batches created yet.</p>
                 <p className="text-slate-400 text-xs mt-1">Click "Add Batch" to get started.</p>
              </div>
            ) : (
              Object.entries(sections[selectedCourse.courseId]).map(([sectionName, staffs]) => (
                <div key={sectionName} className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  
                  {/* Batch Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{sectionName.replace('BatchBatch', 'Batch')}</h4>
                        {staffs && staffs.length > 0 ? (
                           <div className="flex flex-wrap gap-2 mt-1.5">
                              {staffs.map(staff => (
                                <div key={staff.staffId} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-100">
                                   <UserPlus size={12} />
                                   {staff.staffName || staff.name || 'Unknown'}
                                </div>
                              ))}
                           </div>
                        ) : (
                           <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                             <AlertCircle size={12} /> No staff assigned
                           </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {staffs && staffs.length > 0 ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStaff(staffs[0].staffCourseId);
                          }}
                          className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-yellow-50 hover:text-yellow-600 border border-transparent hover:border-yellow-200 transition-all"
                          title="Edit Staff"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStaff(staffs[0].staffCourseId);
                          }}
                          className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 transition-all"
                          title="Remove Staff"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatch(sectionName.replace('BatchBatch', 'Batch'));
                          setShowAllocateStaffModal(true);
                          setShowCourseDetailsModal(false);
                        }}
                        className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <UserPlus size={14} />
                        Allocate Staff
                      </button>
                    )}
                    
                    <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                    <button
                      onClick={() => onDeleteBatch(selectedCourse.courseId, sectionName)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      disabled={deletingBatches.has(sectionName.replace('BatchBatch', 'Batch'))}
                      title="Delete Batch"
                    >
                      {deletingBatches.has(sectionName.replace('BatchBatch', 'Batch')) ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
           </div>
        </div>

      </div>
    </ModalWrapper>
  );
};

export default CourseDetailsModal;