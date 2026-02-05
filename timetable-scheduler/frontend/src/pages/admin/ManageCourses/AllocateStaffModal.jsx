import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Search, User, Building } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService';

const API_BASE = 'http://localhost:4000/api/admin';

// --- Reusable Modern Modal Wrapper (Same as before for consistency) ---
const ModalWrapper = ({ title, children, onClose, onBack, width = "max-w-lg" }) => {
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
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end rounded-b-2xl">
           <button
             onClick={onBack}
             className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
           >
             Cancel
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const AllocateStaffModal = ({
  selectedCourse,
  selectedBatch,
  staffSearch,
  setStaffSearch,
  getFilteredStaff,
  handleAllocateStaff,
  setShowAllocateStaffModal,
  setShowCourseDetailsModal,
}) => {

  const handleClose = () => {
    setShowAllocateStaffModal(false);
    setStaffSearch('');
    // Optionally return to parent modal or close completely
    // Here logic implies returning to details modal usually
    setShowCourseDetailsModal(true); 
  };

  const onAllocateStaff = async (staffId) => {
    if (!selectedCourse?.courseId || !selectedBatch || !staffId) {
      toast.error('Missing course, batch, or staff information');
      return;
    }

    try {
      // 1. Get Section ID
      const sectionRes = await api.get(`${API_BASE}/courses/${selectedCourse.courseId}/sections`);
      
      // Handle the 'BatchBatch' normalization logic you used elsewhere
      const section = sectionRes.data.data.find(s => 
        (s.sectionName === selectedBatch) || 
        (s.sectionName.replace('BatchBatch', 'Batch') === selectedBatch)
      );

      if (!section) {
        toast.error(`Section "${selectedBatch}" not found for this course`);
        return;
      }

      // 2. Get Staff Details
      const staffList = getFilteredStaff(); // Ensure this prop function returns the full list if search is empty/handled correctly
      const staff = staffList.find(s => s.id === staffId);
      
      if (!staff) {
        toast.error('Selected staff member not found in list');
        return;
      }

      // 3. Send API Request
      await api.post(`${API_BASE}/courses/${selectedCourse.courseId}/staff`, {
        Userid: staffId,
        courseId: selectedCourse.courseId,
        sectionId: section.sectionId,
        departmentId: staff.departmentId,
      });

      toast.success('Staff allocated successfully');
      handleAllocateStaff(staffId); // Refresh parent state
      handleClose(); // Close this modal and return to details

    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error allocating staff';
      if (err.response?.status === 400 && message.includes('already allocated')) {
          toast.warning(`Staff member is already allocated to this section.`);
      } else {
          toast.error(message);
      }
      console.error('Allocation Error:', err);
    }
  };

  const filteredStaffList = getFilteredStaff();

  return (
    <ModalWrapper 
      title={`Allocate Staff`} 
      onClose={handleClose}
      onBack={handleClose}
      width="max-w-xl"
    >
      <div className="space-y-6">
        
        {/* Context Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
             <UserPlus className="w-5 h-5" />
          </div>
          <div>
             <h4 className="font-bold text-slate-800 text-sm">Target Allocation</h4>
             <p className="text-xs text-slate-600 mt-0.5">
               Course: <span className="font-semibold">{selectedCourse.courseCode}</span>
               <span className="mx-2">•</span>
               Batch: <span className="font-semibold">{selectedBatch}</span>
             </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search staff by name, ID, or department..."
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-sm font-medium"
            autoFocus
          />
        </div>

        {/* Staff List */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
          {filteredStaffList.length > 0 ? (
            filteredStaffList.map(staff => (
              <div
                key={staff.id}
                onClick={() => onAllocateStaff(staff.id)}
                className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-white group-hover:text-blue-600 transition-colors">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 text-sm">{staff.name}</h5>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><User className="w-3 h-3"/> {staff.id}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1"><Building className="w-3 h-3"/> {staff.departmentName}</span>
                    </div>
                  </div>
                </div>
                
                <button className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-600 group-hover:border-blue-200 transition-all shadow-sm">
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
               <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
               <p className="text-slate-500 text-sm font-medium">No staff members found.</p>
               <p className="text-slate-400 text-xs">Try searching for a different name or ID.</p>
            </div>
          )}
        </div>

      </div>
    </ModalWrapper>
  );
};

export default AllocateStaffModal;