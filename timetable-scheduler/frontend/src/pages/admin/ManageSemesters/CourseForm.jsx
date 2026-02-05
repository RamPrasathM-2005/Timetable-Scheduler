import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X, AlertCircle, BookOpen, Clock, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService';
import { courseTypes, categories } from './branchMap';

const API_BASE = 'http://localhost:4000/api/admin';

// --- Reusable Modern Modal Wrapper ---
const ModalWrapper = ({ title, children, onClose, onSave, saveText = "Save", saveDisabled = false, width = "max-w-3xl" }) => {
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

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saveDisabled}
            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl focus:ring-4 focus:ring-blue-100 transition-all shadow-md flex items-center gap-2
              ${saveDisabled ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
          >
            <Save className="w-4 h-4" />
            {saveText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CourseForm = ({ isOpen, onClose, semesterId, course = null, onRefresh }) => {
  const [formData, setFormData] = useState({
    courseCode: '',
    courseTitle: '',
    type: 'THEORY',
    category: 'BSC',
    minMark: 40,
    maxMark: 100,
    lectureHours: 3,
    tutorialHours: 1,
    practicalHours: 0,
    experientialHours: 0,
    totalContactPeriods: 4,
    credits: 4,
    isActive: 'YES',
    createdBy: 'admin',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (course) {
      setFormData({ ...course, updatedBy: 'admin' });
    } else {
      setFormData({
        courseCode: '',
        courseTitle: '',
        type: 'THEORY',
        category: 'BSC',
        minMark: 40,
        maxMark: 100,
        lectureHours: 3,
        tutorialHours: 1,
        practicalHours: 0,
        experientialHours: 0,
        totalContactPeriods: 4,
        credits: 4,
        isActive: 'YES',
        createdBy: 'admin',
      });
    }
    setErrors({});
  }, [course]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.courseTitle.trim()) newErrors.courseTitle = 'Title is required';
    if (!formData.courseCode.trim()) newErrors.courseCode = 'Course Code is required';
    if (Number(formData.minMark) > Number(formData.maxMark)) newErrors.minMark = 'Min mark must be ≤ Max mark';
    
    const totalHours =
      Number(formData.lectureHours) +
      Number(formData.tutorialHours) +
      Number(formData.practicalHours) +
      Number(formData.experientialHours);
      
    if (Number(formData.totalContactPeriods) !== totalHours) {
      newErrors.totalContactPeriods = `Sum of hours (${totalHours}) must equal Total Contact Periods`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      if (course) {
        await api.put(`${API_BASE}/courses/${course.courseId}`, formData);
        toast.success('Course updated successfully');
      } else {
        const response = await api.post(`${API_BASE}/semesters/${semesterId}/courses`, {
          ...formData,
          semesterId,
        });
        if (response.data?.error) {
           throw new Error(response.data.error);
        }
        toast.success('Course added successfully');
      }
      onClose();
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save course';
      if (msg.includes('Duplicate entry')) {
        toast.error('Unique constraint violated (Course Code must be unique)');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper
      title={course ? 'Edit Course Details' : 'Add New Course'}
      onClose={onClose}
      onSave={handleSubmit}
      saveText={loading ? 'Saving...' : (course ? 'Update Course' : 'Create Course')}
      saveDisabled={loading}
    >
      <div className="space-y-8">
        
        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
             <BookOpen className="w-5 h-5 text-blue-600" />
             <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Course Information</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Course Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. 23CSE101"
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-4 transition-all outline-none ${
                  errors.courseCode 
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100' 
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-50 hover:border-blue-400'
                }`}
              />
              {errors.courseCode && <p className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.courseCode}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Course Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Data Structures"
                value={formData.courseTitle}
                onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-4 transition-all outline-none ${
                  errors.courseTitle 
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100' 
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-50 hover:border-blue-400'
                }`}
              />
              {errors.courseTitle && <p className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.courseTitle}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Type</label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full appearance-none px-4 py-2.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none bg-white font-medium text-slate-700"
                >
                  {courseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Category</label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full appearance-none px-4 py-2.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none bg-white font-medium text-slate-700"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Active Status</label>
              <select
                value={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-xl outline-none font-bold text-sm ${
                  formData.isActive === 'YES' 
                    ? 'border-green-200 bg-green-50 text-green-700 focus:ring-green-100' 
                    : 'border-red-200 bg-red-50 text-red-700 focus:ring-red-100'
                }`}
              >
                <option value="YES">Active</option>
                <option value="NO">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Marks & Credits */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
             <FileText className="w-5 h-5 text-purple-600" />
             <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Evaluation & Credits</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Min Pass Mark</label>
              <input
                type="number"
                value={formData.minMark}
                onChange={(e) => setFormData({ ...formData, minMark: parseInt(e.target.value) || 0 })}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-4 transition-all outline-none ${errors.minMark ? 'border-red-300 bg-red-50' : 'border-slate-300 focus:border-purple-500 focus:ring-purple-50'}`}
                min="0"
              />
               {errors.minMark && <p className="text-xs text-red-600 font-medium">{errors.minMark}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Max Mark</label>
              <input
                type="number"
                value={formData.maxMark}
                onChange={(e) => setFormData({ ...formData, maxMark: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-50 outline-none transition-all"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Credits</label>
              <input
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-50 outline-none transition-all font-semibold text-slate-900"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Hours Allocation */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
             <Clock className="w-5 h-5 text-orange-600" />
             <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Hours Allocation</h4>
          </div>

          <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Lecture (L)</label>
                <input
                  type="number"
                  value={formData.lectureHours}
                  onChange={(e) => setFormData({ ...formData, lectureHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Tutorial (T)</label>
                <input
                  type="number"
                  value={formData.tutorialHours}
                  onChange={(e) => setFormData({ ...formData, tutorialHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Practical (P)</label>
                <input
                  type="number"
                  value={formData.practicalHours}
                  onChange={(e) => setFormData({ ...formData, practicalHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                  min="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Experiential (E)</label>
                <input
                  type="number"
                  value={formData.experientialHours}
                  onChange={(e) => setFormData({ ...formData, experientialHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="border-t border-orange-100 pt-3 flex flex-col sm:flex-row justify-between items-center gap-3">
               <div className="space-y-1 w-full sm:w-auto">
                 <label className="block text-sm font-semibold text-slate-700">Total Contact Periods</label>
                 <div className="relative">
                    <input
                      type="number"
                      value={formData.totalContactPeriods}
                      onChange={(e) => setFormData({ ...formData, totalContactPeriods: parseInt(e.target.value) || 0 })}
                      className={`w-full sm:w-40 px-4 py-2 border rounded-lg font-bold text-slate-900 ${errors.totalContactPeriods ? 'border-red-400 bg-red-50' : 'border-orange-200 bg-white'}`}
                      min="0"
                    />
                 </div>
                 {errors.totalContactPeriods && <p className="text-xs text-red-600 font-medium">{errors.totalContactPeriods}</p>}
               </div>
               
               <div className="text-xs text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                 <span className="font-semibold text-orange-600">Note:</span> Total periods should match sum of L+T+P+E
               </div>
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default CourseForm;