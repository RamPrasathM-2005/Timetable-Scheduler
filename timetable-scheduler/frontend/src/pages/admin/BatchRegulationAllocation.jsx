import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import toast styles
import { api } from '../../services/authService.js';

const BatchRegulationAllocation = () => {
  const [batches, setBatches] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedRegulation, setSelectedRegulation] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchRegulations();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/batches');
      setBatches(res.data.data || []);
    } catch (err) {
      console.error('Fetch batches error:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegulations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/regulations');
      setRegulations(res.data.data || []);
    } catch (err) {
      console.error('Fetch regulations error:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch regulations');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedDegree || !selectedBranch || !selectedBatch || !selectedRegulation) {
      toast.error('Please select degree, branch, batch, and regulation', {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    setIsAllocating(true);
    try {
      const response = await api.post('/admin/regulations/allocate-to-batch', {
        batchId: selectedBatch,
        regulationId: selectedRegulation,
      });
      toast.success(response.data.message || 'Regulation successfully allocated to batch', {
        position: "top-right",
        autoClose: 5000,
      });
      // Reset selections after successful allocation
      setSelectedDegree('');
      setSelectedBranch('');
      setSelectedBatch('');
      setSelectedRegulation('');
    } catch (err) {
      console.error('Allocation error:', err);
      toast.error(err.response?.data?.message || 'Error allocating regulation to batch', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsAllocating(false);
    }
  };

  // Get unique degrees
  const uniqueDegrees = [...new Set(batches.map(batch => batch.degree))];

  // Get branches filtered by selected degree
  const filteredBranches = [...new Set(
    batches
      .filter(batch => !selectedDegree || batch.degree === selectedDegree)
      .map(batch => batch.branch)
  )];

  // Get batches filtered by selected degree and branch
  const filteredBatches = batches
    .filter(batch => 
      (!selectedDegree || batch.degree === selectedDegree) &&
      (!selectedBranch || batch.branch === selectedBranch)
    );

  // Get regulations filtered by selected branch (using Deptacronym)
  const filteredRegulations = regulations
    .filter(reg => !selectedBranch || reg.Deptacronym === selectedBranch)
    .map(reg => ({
      regulationId: reg.regulationId,
      regulationYear: reg.regulationYear
    }));

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="w-full max-w-7xl mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Allocate Regulation to Batch</h1>
        <p className="text-gray-600 mt-1">Select a degree, branch, batch, and regulation to allocate courses</p>
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6 mt-4">
          <div className="flex flex-wrap gap-4 items-end justify-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <select
                value={selectedDegree}
                onChange={(e) => {
                  setSelectedDegree(e.target.value);
                  setSelectedBranch('');
                  setSelectedBatch('');
                  setSelectedRegulation('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select Degree</option>
                {uniqueDegrees.map(degree => (
                  <option key={degree} value={degree}>
                    {degree}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedBatch('');
                  setSelectedRegulation('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={!selectedDegree}
              >
                <option value="">Select Branch</option>
                {filteredBranches.map(branch => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={!selectedBranch}
              >
                <option value="">Select Batch</option>
                {filteredBatches.map(batch => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.batch}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Regulation Year</label>
              <select
                value={selectedRegulation}
                onChange={(e) => setSelectedRegulation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={!selectedBranch}
              >
                <option value="">Select Regulation Year</option>
                {filteredRegulations.map(reg => (
                  <option key={reg.regulationId} value={reg.regulationId}>
                    {reg.regulationYear}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAllocate}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg font-semibold"
              disabled={isAllocating}
            >
              {isAllocating ? 'Allocating...' : 'Allocate to Batch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchRegulationAllocation;