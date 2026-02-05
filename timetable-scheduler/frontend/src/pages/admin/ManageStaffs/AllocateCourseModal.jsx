import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Plus, Trash2, Search, Filter, Layers, Check } from 'lucide-react';

// --- Reusable Modern Modal Wrapper ---
const ModalWrapper = ({ title, children, onClose, onSave, saveText = "Save", saveDisabled = false, width = "max-w-2xl" }) => {
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
            // FIX: Removed disabled={saveDisabled} so the X button always works
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
            // FIX: Removed disabled={saveDisabled} so Cancel always works
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

const AllocateCourseModal = React.memo(({
  selectedStaff,
  setSelectedStaff,
  setShowAllocateCourseModal,
  setSelectedCourse,
  setSelectedSectionId,
  courseSearch,
  setCourseSearch,
  courseFilters,
  setCourseFilters,
  selectedCourse,
  selectedSectionId,
  handleAllocateCourse,
  setShowAddBatchModal,
  setShowStaffDetailsModal,
  operationFromModal,
  getFilteredCourses,
  semesters,
  batches,
  operationLoading,
  handleRemoveCourse,
  courseRefreshKey,
}) => {
  const semesterOptions = [...new Set(semesters.map(sem => String(sem.semesterNumber)))].filter(sem => sem).sort((a, b) => a - b);
  const batchOptions = [...new Set(semesters.map(sem => sem.batchYears))].filter(batch => batch).sort();

  useEffect(() => {
    if (selectedCourse) {
      const updatedCourse = getFilteredCourses.find(c => c.courseId === selectedCourse.courseId);
      if (updatedCourse) {
        setSelectedCourse(updatedCourse);
        setSelectedSectionId(updatedCourse.isAllocated ? selectedStaff.allocatedCourses.find(c => c.courseCode === updatedCourse.code)?.sectionId || '' : '');
      } else {
        setSelectedCourse(null);
        setSelectedSectionId('');
      }
    }
  }, [selectedStaff.allocatedCourses, getFilteredCourses, selectedCourse, setSelectedCourse, setSelectedSectionId, courseRefreshKey]);

  const courseListKey = useMemo(() => {
    return `${selectedStaff.staffId}-${selectedStaff.allocatedCourses.map(c => `${c.courseCode}-${c.sectionId}`).join('-')}-${getFilteredCourses.map(c => c.courseId).join('-')}-${courseRefreshKey}`;
  }, [selectedStaff, getFilteredCourses, courseRefreshKey]);

  const handleClose = () => {
    setShowAllocateCourseModal(false);
    setSelectedCourse(null);
    setSelectedSectionId('');
    setCourseSearch('');
    setCourseFilters({ dept: '', semester: '', batch: '' });
    if (operationFromModal) setShowStaffDetailsModal(true);
  };

  const handleSave = () => {
    handleAllocateCourse();
  };

  return (
    <ModalWrapper
      title={`Allocate Course to ${selectedStaff.name}`}
      onClose={handleClose}
      onSave={handleSave}
      saveText={operationLoading ? 'Processing...' : (selectedCourse?.isAllocated ? 'Update Allocation' : 'Allocate Course')}
      saveDisabled={!selectedCourse || !selectedSectionId || operationLoading}
      width="max-w-3xl"
    >
      <div className="space-y-6">
        
        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
             <input
               type="text"
               placeholder="Search by course name or code..."
               value={courseSearch}
               onChange={e => setCourseSearch(e.target.value)}
               className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all text-sm"
               disabled={operationLoading}
             />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
             <div className="flex-1 relative">
                <select
                  value={courseFilters.dept}
                  onChange={e => setCourseFilters({ ...courseFilters, dept: e.target.value, batch: '' })}
                  className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                  disabled={operationLoading}
                >
                  <option value="">All Departments</option>
                  {[...new Set(batches.map(batch => batch.branch))].filter(d => d).sort().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>

             <div className="flex-1 relative">
                <select
                  value={courseFilters.semester}
                  onChange={e => setCourseFilters({ ...courseFilters, semester: e.target.value, batch: '' })}
                  className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                  disabled={operationLoading}
                >
                  <option value="">All Semesters</option>
                  {semesterOptions.map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>

             <div className="flex-1 relative">
                <select
                  value={courseFilters.batch}
                  onChange={e => setCourseFilters({ ...courseFilters, batch: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                  disabled={operationLoading}
                >
                  <option value="">All Batches</option>
                  {batchOptions.map(batch => <option key={batch} value={batch}>{batch}</option>)}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* Section Action Button */}
        {selectedCourse && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowAllocateCourseModal(false);
                setShowAddBatchModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold border border-purple-200 transition-colors"
              disabled={operationLoading}
            >
              <Plus size={14} /> Add New Section
            </button>
          </div>
        )}

        {/* Course List */}
        <div key={courseListKey} className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {getFilteredCourses.length > 0 ? (
            getFilteredCourses.map(course => {
              const isSelected = selectedCourse?.courseId === course.courseId;
              return (
                <div
                  key={course.courseId}
                  className={`relative bg-white p-4 rounded-xl transition-all duration-200 cursor-pointer flex flex-col gap-1
                    ${isSelected 
                      ? 'border-2 border-indigo-500 shadow-md ring-4 ring-indigo-50/50' 
                      : 'border border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                    } ${operationLoading ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => {
                    if (!operationLoading) {
                      setSelectedCourse(course);
                      setSelectedSectionId(course.isAllocated ? selectedStaff.allocatedCourses.find(c => c.courseCode === course.code)?.sectionId || '' : '');
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                         {course.code || 'N/A'}
                         {course.isAllocated && (
                           <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded border border-green-200 font-semibold flex items-center gap-1">
                             <Check size={10} /> Allocated
                           </span>
                         )}
                      </h4>
                      <p className="text-sm font-medium text-slate-700">{course.name || 'Unknown Course'}</p>
                    </div>
                    {isSelected && <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white"><Check size={12} strokeWidth={3} /></div>}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                     <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">Sem {course.semester || '?'}</span>
                     <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">Batch {course.batchYears || '?'}</span>
                     <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">{course.department || '?'}</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">Available Sections: <span className="text-slate-600 font-medium">{course.sections.length > 0 ? course.sections.map(s => s.sectionName).join(', ') : 'None'}</span></p>

                  {course.isAllocated && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xs font-semibold text-indigo-600">Current: {course.currentBatch || 'N/A'}</p>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const staffCourseId = selectedStaff.allocatedCourses.find(c => c.courseCode === course.code)?.id;
                          handleRemoveCourse(selectedStaff, staffCourseId);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Allocation"
                        disabled={operationLoading}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl">
               <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
               <p className="text-slate-500 text-sm font-medium">No courses found matching criteria.</p>
            </div>
          )}
        </div>

        {/* Section Selection Area */}
        {selectedCourse && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 animate-in slide-in-from-bottom-2">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Select Section for {selectedCourse.code}
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {selectedCourse.sections.length > 0 ? (
                selectedCourse.sections.map(section => {
                  const isSecSelected = selectedSectionId === section.sectionId;
                  return (
                    <button
                      key={section.sectionId}
                      onClick={() => setSelectedSectionId(section.sectionId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                        ${isSecSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      disabled={operationLoading}
                    >
                      {section.sectionName}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 italic">No sections available. Please add one above.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </ModalWrapper>
  );
});

export default AllocateCourseModal;