import React, { useState } from 'react';
import { Plus, BookOpen, CalendarDays } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService'; // Import the api instance
import { degrees, branchMap } from './branchMap';

const API_BASE = 'http://localhost:4000/api/admin';

const CreateSemesterForm = ({ showCreateForm, setShowCreateForm, onRefresh }) => {
  const [formData, setFormData] = useState({
    degree: '',
    batch: '',
    branch: '',
    semesterNumber: '',
    startDate: '',
    endDate: '',
    createdBy: 'admin'
  });
  const [loading, setLoading] = useState(false);

  const branches = Object.keys(branchMap);

  const handleSubmit = async () => {
    if (!formData.degree || !formData.batch || !formData.branch || !formData.semesterNumber || !formData.startDate || !formData.endDate) {
      toast.error('Please fill all fields');
      return;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('Start date must be before end date');
      return;
    }
    if (parseInt(formData.semesterNumber) < 1 || parseInt(formData.semesterNumber) > 8) {
      toast.error('Semester number must be between 1 and 8');
      return;
    }

    setLoading(true);
    try {
      // Check existing semesters for batch/branch/degree (handle 404 as empty)
      let existing = [];
      try {
        const { data: existingRes } = await api.get(`${API_BASE}/semesters/by-batch-branch?batch=${formData.batch}&branch=${formData.branch}&degree=${formData.degree}`);
        existing = existingRes.data || [];
      } catch (existingErr) {
        if (existingErr.response?.status !== 404) {
          throw existingErr; // Re-throw non-404 errors
        }
        // 404 means no existing semesters (length 0), safe to proceed
      }
      if (existing.length >= 8) {
        toast.error('Maximum 8 semesters allowed per batch');
        return;
      }

      // Check if batch exists (existing code handles 404 by creating)
      let batchId;
      try {
        const { data: batchRes } = await api.get(`${API_BASE}/batches/find?degree=${formData.degree}&branch=${formData.branch}&batch=${formData.batch}`);
        batchId = batchRes.data.batchId;
      } catch (err) {
        if (err.response?.status === 404) {
          // Create batch
          const batchYears = `${formData.batch}-${parseInt(formData.batch) + 4}`;
          const batchRes = await api.post(`${API_BASE}/batches`, {
            degree: formData.degree,
            branch: formData.branch,
            batch: formData.batch,
            batchYears,
            createdBy: 'admin'
          });
          batchId = batchRes.data.batchId;
          toast.success('Batch created successfully');
        } else {
          throw err;
        }
      }

      // Create semester
      const semesterRes = await api.post(`${API_BASE}/semesters`, {
        ...formData,
        semesterNumber: parseInt(formData.semesterNumber)
      });
      toast.success('Semester created successfully');
      setFormData({ degree: '', batch: '', branch: '', semesterNumber: '', startDate: '', endDate: '', createdBy: 'admin' });
      setShowCreateForm(false);
      onRefresh(); // Refresh list
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create semester';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Semester
        </h2>
      </div>

      {!showCreateForm ? (
        <div className="text-center py-8">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Add New Semester</h3>
          <p className="text-gray-600 mb-6">Create a new semester for a specific batch, degree, and branch</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Semester
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
              <select
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Select Degree</option>
                {degrees.map((deg) => (
                  <option key={deg} value={deg}>{deg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Batch Year</label>
              <input
                type="text"
                placeholder="e.g., 2023"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Select Branch</option>
                {branches.map((code) => (
                  <option key={code} value={code}>{branchMap[code]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester Number</label>
              <select
                value={formData.semesterNumber}
                onChange={(e) => setFormData({ ...formData, semesterNumber: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Select Semester</option>
                {[1,2,3,4,5,6,7,8].map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-6 py-3 bg-gray-200 rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSemesterForm;