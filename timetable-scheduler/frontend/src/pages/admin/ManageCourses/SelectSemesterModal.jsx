import React from 'react';
import { X } from 'lucide-react';

const SelectSemesterModal = ({
  semesters,
  selectedSemesterId,
  setSelectedSemesterId,
  setShowCreateModal,
  handleNextToForm,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Select Semester for New Course</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Semester *</label>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Semester</option>
              {semesters.map(sem => (
                <option key={sem.semesterId} value={sem.semesterId}>
                  Semester {sem.semesterNumber} - {sem.branch} {sem.batch || ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleNextToForm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              disabled={!selectedSemesterId}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectSemesterModal;