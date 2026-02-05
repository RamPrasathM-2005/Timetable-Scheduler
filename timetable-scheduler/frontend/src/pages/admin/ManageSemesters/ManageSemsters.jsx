import React, { useState, useEffect } from 'react';
import { Plus, GraduationCap } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import { api } from '../../../services/authService';
import SearchBar from './SearchBar';
import SemesterList from './SemesterList';
import CreateSemesterForm from './CreateSemesterForm';
import SemesterDetails from './SemesterDetails';
import Swal from 'sweetalert2';
import { branchMap } from './branchMap';

const API_BASE = 'http://localhost:4000/api/admin';

const ManageSemesters = () => {
  const [allSemesters, setAllSemesters] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [searchQuery, setSearchQuery] = useState({ degree: '', batch: '', branch: '', semesterNumber: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`${API_BASE}/semesters`);
      console.log('ManageSemesters: Fetched semesters:', data.data);
      setAllSemesters(data.data || []);
      setFilteredSemesters(data.data || []);
    } catch (err) {
      console.error('ManageSemesters: Error fetching semesters:', err.response?.data || err);
      toast.error('Failed to fetch semesters');
      setAllSemesters([]);
      setFilteredSemesters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = allSemesters;
    if (searchQuery.degree) filtered = filtered.filter(s => s.degree === searchQuery.degree);
    if (searchQuery.batch) filtered = filtered.filter(s => s.batch.includes(searchQuery.batch));
    if (searchQuery.branch) filtered = filtered.filter(s => s.branch === searchQuery.branch);
    if (searchQuery.semesterNumber) filtered = filtered.filter(s => s.semesterNumber === parseInt(searchQuery.semesterNumber));

    filtered.sort((a, b) => b.semesterId - a.semesterId);
    setFilteredSemesters(filtered.slice(0, 5));
  }, [searchQuery, allSemesters]);

  const handleDeleteSemester = (semesterId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action will permanently delete the semester and its associated data!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        api.delete(`${API_BASE}/semesters/${semesterId}`)
          .then((response) => {
            if (response.data.status === 'success') {
              setAllSemesters(prev => prev.filter(s => s.semesterId !== semesterId));
              setFilteredSemesters(prev => prev.filter(s => s.semesterId !== semesterId));
              if (selectedSemester?.semesterId === semesterId) {
                setSelectedSemester(null);
              }
              Swal.fire({
                title: 'Success',
                text: 'Semester deleted successfully',
                icon: 'success',
                confirmButtonText: 'OK'
              });
            } else {
              Swal.fire({
                title: 'Error',
                text: response.data.message || 'Failed to delete semester',
                icon: 'error',
                confirmButtonText: 'OK'
              });
            }
          })
          .catch((err) => {
            console.error('ManageSemesters: Error deleting semester:', err.response?.data || err);
            const errorMsg = err.response?.data?.message || err.message;
            if (errorMsg.includes('foreign key constraint fails')) {
              Swal.fire({
                title: 'Cannot Delete',
                text: 'This semester cannot be deleted because it has associated courses. Please remove or reassign the courses first.',
                icon: 'error',
                confirmButtonText: 'OK'
              });
            } else {
              Swal.fire({
                title: 'Error',
                text: 'Failed to delete semester',
                icon: 'error',
                confirmButtonText: 'OK'
              });
            }
          });
      }
    });
  };

  const handleRefresh = (semesterId, isCourseDeletion) => {
    console.log(`ManageSemesters: Refresh triggered for semester ${semesterId}, isCourseDeletion: ${isCourseDeletion}`);
    fetchSemesters();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full max-w-7xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900">Manage Semesters</h1>
            <p className="text-gray-600 mt-1">Create and manage semesters for different batches and departments</p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg font-semibold"
            >
              <Plus size={20} />
              Add Semester
            </button>
          </div>
        </div>
        <div className="w-full max-w-7xl shadow-lg rounded-lg p-6 bg-white">
          {!selectedSemester ? (
            <>
              <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              <SemesterList 
                semesters={filteredSemesters} 
                onSemesterClick={setSelectedSemester} 
                onDelete={handleDeleteSemester} 
                onRefresh={handleRefresh} 
              />
              <CreateSemesterForm
                showCreateForm={showCreateForm}
                setShowCreateForm={setShowCreateForm}
                onRefresh={fetchSemesters}
                branchMap={branchMap}
              />
            </>
          ) : (
            <SemesterDetails 
              semester={selectedSemester} 
              onBack={() => setSelectedSemester(null)} 
              onDelete={handleDeleteSemester}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageSemesters;