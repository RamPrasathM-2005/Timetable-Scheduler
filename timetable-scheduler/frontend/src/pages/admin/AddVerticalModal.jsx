import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../services/authService';

const API_BASE = 'http://localhost:4000/api/admin';

const AddVerticalModal = ({ regulationId, setShowAddVerticalModal, onVerticalAdded }) => {
  const [verticalName, setVerticalName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verticalName.trim()) {
      toast.error('Vertical name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`${API_BASE}/regulations/verticals`, {
        regulationId,
        verticalName: verticalName.trim(),
      });
      toast.success('Vertical added successfully');
      setVerticalName('');
      setShowAddVerticalModal(false);
      onVerticalAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding vertical');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add New Vertical</h2>
            <button
              onClick={() => setShowAddVerticalModal(false)}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Vertical Name *</label>
              <input
                type="text"
                value={verticalName}
                onChange={(e) => setVerticalName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                disabled={isSubmitting}
                placeholder="Enter vertical name (e.g., AI)"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddVerticalModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Vertical'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVerticalModal;