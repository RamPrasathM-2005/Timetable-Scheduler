import React, { useState, useEffect } from 'react';
import { Edit, X, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService'; // Import the api instance
import { degrees, branchMap } from './branchMap';

const API_BASE = 'http://localhost:4000/api/admin';

const SemesterUpdateForm = ({ isOpen, onClose, semester, onRefresh }) => {
  const [formData, setFormData] = useState({
    degree: '',
    batch: '',
    branch: '',
    semesterNumber: '',
    startDate: '',
    endDate: '',
    isActive: 'YES',
    updatedBy: 'admin'
  });
  const [loading, setLoading] = useState(false);

  const branches = Object.keys(branchMap);

  useEffect(() => {
    if (semester) {
      setFormData({
        degree: semester.degree || '',
        batch: semester.batch || '',
        branch: semester.branch || '',
        semesterNumber: semester.semesterNumber || '',
        startDate: semester.startDate || '',
        endDate: semester.endDate || '',
        isActive: semester.isActive || 'YES',
        updatedBy: 'admin'
      });
    }
  }, [semester]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.degree || !formData.batch || !formData.branch || !formData.semesterNumber || !formData.startDate || !formData.endDate) {
      toast.error('Please fill all fields');
      return;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      await api.put(`${API_BASE}/semesters/${semester.semesterId}`, formData);
      toast.success('Semester updated successfully');
      onClose();
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update semester';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Semester</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <select
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Degree</option>
                {degrees.map((deg) => (
                  <option key={deg} value={deg}>{deg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Year</label>
              <input
                type="text"
                placeholder="e.g., 2023"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Branch</option>
                {branches.map((code) => (
                  <option key={code} value={code}>{branchMap[code]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester Number</label>
              <select
                value={formData.semesterNumber}
                onChange={(e) => setFormData({ ...formData, semesterNumber: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Semester</option>
                {[1,2,3,4,5,6,7,8].map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {loading ? 'Updating...' : 'Update'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 p-2 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SemesterUpdateForm;