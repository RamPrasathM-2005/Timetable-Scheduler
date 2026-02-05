import React, { useState, useEffect } from 'react';
import { Plus, Upload, Download, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/authService';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:4000/api/admin';

const NptelCourseCard = ({ course, onEdit, onDelete }) => {
  const typeColor = course.type === 'OEC' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800';

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{course.courseTitle}</h3>
          <p className="text-sm text-gray-600 mt-1">{course.courseCode}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColor}`}>
          {course.type}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>Credits: <strong>{course.credits}</strong></span>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(course)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(course.nptelCourseId)}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        {course.semesterDetails?.branch} • Semester {course.semesterDetails?.semesterNumber} • {course.semesterDetails?.batch}
      </div>
    </div>
  );
};

const SelectSemesterModal = ({
  semesters,
  selectedSemesterId,
  setSelectedSemesterId,
  onClose,
  onNext,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Select Semester</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <select
          value={selectedSemesterId}
          onChange={(e) => setSelectedSemesterId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose Semester</option>
          {semesters.map(sem => (
            <option key={sem.semesterId} value={sem.semesterId}>
              Semester {sem.semesterNumber} - {sem.branch} {sem.batch || ''}
            </option>
          ))}
        </select>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onNext}
            disabled={!selectedSemesterId}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const NptelFormModal = ({ isOpen, onClose, semesterId, course = null, onSuccess }) => {
  const [form, setForm] = useState({
    courseTitle: course?.courseTitle || '',
    courseCode: course?.courseCode || '',
    type: course?.type || 'OEC',
    credits: course?.credits || 3,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courseTitle || !form.courseCode || !form.credits) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      if (course) {
        await api.put(`${API_BASE}/nptel-courses/${course.nptelCourseId}`, { ...form, semesterId });
        toast.success('NPTEL course updated');
      } else {
        await api.post(`${API_BASE}/nptel-courses`, { ...form, semesterId });
        toast.success('NPTEL course added');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold mb-6">{course ? 'Edit' : 'Add'} NPTEL Course</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
            <input
              type="text"
              value={form.courseTitle}
              onChange={(e) => setForm({ ...form, courseTitle: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Code *</label>
            <input
              type="text"
              value={form.courseCode}
              onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="OEC">OEC</option>
              <option value="PEC">PEC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
            <input
              type="number"
              min="1"
              max="4"
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              {course ? 'Update' : 'Add'} Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ImportNptelModal = ({ semesters, isOpen, onClose, onImport }) => {
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [file, setFile] = useState(null);

  const handleImport = () => {
    if (!selectedSemesterId || !file) {
      toast.error('Select semester and file');
      return;
    }
    onImport(file, selectedSemesterId);
    onClose();
  };

  const downloadTemplate = () => {
    const headers = [['Course Name', 'Course Code', 'Type (OEC/PEC)', 'Credits']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NPTEL Courses');
    XLSX.writeFile(wb, 'nptel_courses_template.xlsx');
    toast.success('Template downloaded');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-6">Import NPTEL Courses</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Semester *</label>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value since="">Select Semester</option>
            {semesters.map(sem => (
              <option key={sem.semesterId} value={sem.semesterId}>
                Semester {sem.semesterNumber} - {sem.branch} {sem.batch}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Excel File *</label>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} className="w-full" />
          {file && <p className="mt-2 text-sm text-green-600">Selected: {file.name}</p>}
        </div>
        <div className="mb-6">
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
          >
            <Download size={16} />
            Download Sample Template
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || !selectedSemesterId}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Import
          </button>
       .w-</div>
      </div>
    </div>
  );
};

const ManageNptelCourses = () => {
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showSelectSemester, setShowSelectSemester] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const semRes = await api.get(`${API_BASE}/semesters`);
      setSemesters(semRes.data.data || []);

      const nptelRes = await api.get(`${API_BASE}/nptel-courses`);
      const nptelData = nptelRes.data.data || [];
      const enriched = nptelData.map(c => ({
        ...c,
        semesterDetails: semRes.data.data.find(s => s.semesterId === c.semesterId) || {},
      }));
      enriched.sort((a, b) => b.nptelCourseId - a.nptelCourseId);
      setCourses(enriched);
      toast.success('NPTEL courses loaded');
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!selectedSemesterId) {
      toast.error('Select a semester');
      return;
    }
    setShowSelectSemester(false);
    setShowForm(true);
  };

  const handleImport = async (file, semesterId) => {
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headers = rows[0].map(h => h.toString().trim());
        if (!['Course Name', 'Course Code', 'Type (OEC/PEC)', 'Credits'].every((h, i) => headers[i] === h)) {
          toast.error('Invalid template. Use the sample template.');
          return;
        }

        const coursesToImport = rows.slice(1).filter(r => r.length >= 4).map(row => ({
          courseTitle: row[0]?.toString().trim(),
          courseCode: row[1]?.toString().trim(),
          type: row[2]?.toString().trim().toUpperCase(),
          credits: parseInt(row[3]),
          semesterId,
        })).filter(c => c.courseTitle && c.courseCode && ['OEC', 'PEC'].includes(c.type) && c.credits > 0);

        await api.post(`${API_BASE}/nptel-courses/bulk`, { courses: coursesToImport });
        toast.success(`Imported ${coursesToImport.length} NPTEL courses`);
        fetchData();
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error('Import failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this NPTEL course?')) return;
    try {
      await api.delete(`${API_BASE}/nptel-courses/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage NPTEL Courses</h1>
            <p className="text-gray-600 mt-1">Add and manage NPTEL (OEC/PEC) courses</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowSelectSemester(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold"
            >
              <Plus size={20} />
              Add NPTEL Course
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold"
            >
              <Upload size={20} />
              Import
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <NptelCourseCard
              key={course.nptelCourseId}
              course={course}
              onEdit={(c) => {
                setEditingCourse(c);
                setSelectedSemesterId(c.semesterId);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900">No NPTEL courses yet</h3>
            <p className="text-gray-500 mt-2">Add your first NPTEL course to get started</p>
          </div>
        )}
      </div>

      {showSelectSemester && (
        <SelectSemesterModal
          semesters={semesters}
          selectedSemesterId={selectedSemesterId}
          setSelectedSemesterId={setSelectedSemesterId}
          onClose={() => {
            setShowSelectSemester(false);
            setSelectedSemesterId('');
          }}
          onNext={handleNext}
        />
      )}

      {showForm && (
        <NptelFormModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingCourse(null);
            setSelectedSemesterId('');
          }}
          semesterId={selectedSemesterId}
          course={editingCourse}
          onSuccess={fetchData}
        />
      )}

      {showImport && (
        <ImportNptelModal
          semesters={semesters}
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
};

export default ManageNptelCourses;