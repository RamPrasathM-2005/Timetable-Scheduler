import React, { useState, useEffect } from 'react';
import { Plus, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { api, getDepartments } from '../../services/authService.js';
import * as XLSX from 'xlsx';
import AddVerticalModal from './AddVerticalModal.jsx';

const API_BASE = 'http://localhost:4000/api/admin';

const ManageRegulations = () => {
  const [departments, setDepartments] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRegulation, setSelectedRegulation] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [file, setFile] = useState(null);
  const [showAddVerticalModal, setShowAddVerticalModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const depts = await getDepartments();
      setDepartments(depts || []);
    } catch (err) {
      const message = err.message || 'Failed to fetch departments';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegulations = async (deptId) => {
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE}/regulations`);
      const filteredRegulations = res.data.data.filter(reg => reg.Deptid === parseInt(deptId));
      setRegulations(filteredRegulations);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch regulations';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerticals = async (regulationId) => {
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE}/regulations/${regulationId}/verticals`);
      setVerticals(res.data.data || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch verticals';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async (regulationId) => {
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE}/regulations/${regulationId}/courses/available`);
      setAvailableCourses(res.data.data || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch available courses';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeptChange = (e) => {
    const deptId = e.target.value;
    setSelectedDept(deptId);
    setSelectedRegulation('');
    setSelectedVertical('');
    setAvailableCourses([]);
    setSelectedCourses([]);
    setError(null);
    if (deptId) {
      fetchRegulations(deptId);
    } else {
      setRegulations([]);
    }
  };

  const handleRegulationChange = (e) => {
    const regulationId = e.target.value;
    setSelectedRegulation(regulationId);
    setSelectedVertical('');
    setAvailableCourses([]);
    setSelectedCourses([]);
    setError(null);
    if (regulationId) {
      fetchVerticals(regulationId);
      fetchAvailableCourses(regulationId);
    } else {
      setVerticals([]);
    }
  };

  const handleVerticalChange = (e) => {
    const value = e.target.value;
    setSelectedVertical(value);
    setSelectedCourses([]);
    setError(null);
    if (value === 'add') {
      setShowAddVerticalModal(true);
    } else {
      setShowAddVerticalModal(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const downloadTemplate = () => {
    try {
      const templateData = [
        {
          'S. No': '',
          'Semester No': '',
          'Course Code': '',
          'Course Title': '',
          Category: '',
          L: '',
          T: '',
          P: '',
          E: '',
          'Total Contact Periods': '',
          Credits: '',
          'Min Marks': '',
          'Max Marks': '',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CourseTemplate');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'course_import_template.xlsx';
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating template:', err);
      toast.error('Failed to generate template: ' + err.message);
    }
  };

  const handleImport = async () => {
    console.log('Selected regulation:', selectedRegulation);
    console.log('Selected file:', file);

    if (!selectedRegulation) {
      toast.error('Please select a regulation', { toastId: 'no-regulation-selected' });
      return;
    }
    if (!file) {
      toast.error('Please select a file', { toastId: 'no-file-selected' });
      return;
    }

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.xls', '.xlsx'];
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Please upload a valid Excel file (.xls or .xlsx)', { toastId: 'invalid-file-type' });
      return;
    }

    setIsImporting(true);
    toast.info('Processing Excel file and creating semesters if needed...', {
      toastId: 'import-processing',
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: 'light',
    });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const expectedHeaders = [
            'S. No',
            'Semester No',
            'Course Code',
            'Course Title',
            'Category',
            'L',
            'T',
            'P',
            'E',
            'Total Contact Periods',
            'Credits',
            'Min Marks',
            'Max Marks',
          ];
          const headers = jsonData[0].map(h => h.toString().trim().toLowerCase());
          const expectedHeadersLower = expectedHeaders.map(h => h.toLowerCase());
          if (!headers.every((header, index) => header === expectedHeadersLower[index])) {
            console.log('Actual headers:', headers);
            toast.error('Invalid Excel format. Please ensure column headers match: ' + expectedHeaders.join(', '), {
              toastId: 'invalid-excel-format',
            });
            return;
          }

          const coursesData = jsonData.slice(1).filter(row => row && row.length >= 13).map(row => ({
            semesterNumber: parseInt(row[1]),
            courseCode: row[2]?.toString().trim(),
            courseTitle: row[3]?.toString().trim(),
            category: row[4]?.toString().trim(),
            lectureHours: parseInt(row[5]) || 0,
            tutorialHours: parseInt(row[6]) || 0,
            practicalHours: parseInt(row[7]) || 0,
            experientialHours: parseInt(row[8]) || 0,
            totalContactPeriods: parseInt(row[9]),
            credits: parseInt(row[10]),
            minMark: parseInt(row[11]),
            maxMark: parseInt(row[12]),
          }));

          const validTypes = ['THEORY', 'INTEGRATED', 'PRACTICAL', 'EXPERIENTIAL LEARNING'];
          const validCategories = ['HSMC', 'BSC', 'ESC', 'PEC', 'OEC', 'EEC', 'PCC'];
          const validCourses = [];
          const invalidCourses = [];

          for (const course of coursesData) {
            const type = determineCourseType(
              course.lectureHours,
              course.tutorialHours,
              course.practicalHours,
              course.experientialHours
            );
            if (
              !course.semesterNumber ||
              isNaN(course.semesterNumber) ||
              course.semesterNumber < 1 ||
              course.semesterNumber > 8 ||
              !course.courseCode ||
              !course.courseTitle ||
              !course.category ||
              !validCategories.includes(course.category.toUpperCase()) ||
              !validTypes.includes(type) ||
              isNaN(course.minMark) ||
              isNaN(course.maxMark) ||
              isNaN(course.totalContactPeriods) ||
              isNaN(course.credits) ||
              course.minMark > course.maxMark ||
              course.minMark < 0 ||
              course.maxMark < 0
            ) {
              invalidCourses.push({
                course,
                error: `Invalid data: ${!course.semesterNumber ? 'Missing semester number' : ''} ${
                  isNaN(course.semesterNumber) ? 'Invalid semester number' : ''
                } ${course.semesterNumber < 1 || course.semesterNumber > 8 ? 'Semester out of range' : ''} ${
                  !course.courseCode ? 'Missing course code' : ''
                } ${!course.courseTitle ? 'Missing course title' : ''} ${
                  !course.category || !validCategories.includes(course.category.toUpperCase())
                    ? 'Invalid category'
                    : ''
                } ${!validTypes.includes(type) ? 'Invalid course type' : ''} ${
                  isNaN(course.minMark) ? 'Invalid min marks' : ''
                } ${isNaN(course.maxMark) ? 'Invalid max marks' : ''} ${
                  isNaN(course.totalContactPeriods) ? 'Invalid total contact periods' : ''
                } ${isNaN(course.credits) ? 'Invalid credits' : ''} ${
                  course.minMark > course.maxMark ? 'Min marks exceed max marks' : ''
                }`,
              });
            } else {
              validCourses.push(course);
            }
          }

          if (invalidCourses.length > 0) {
            console.warn('Invalid courses:', invalidCourses);
            toast.warn(
              <>
                Some courses were invalid and skipped. Check console or{' '}
                <button
                  className="underline text-blue-600"
                  onClick={() => alert(JSON.stringify(invalidCourses, null, 2))}
                >
                  view details
                </button>.
              </>,
              { toastId: 'invalid-courses-warning' }
            );
          }
          if (validCourses.length === 0) {
            toast.error('No valid courses to import.', { toastId: 'no-valid-courses' });
            return;
          }

          console.log('Sending API request:', { courses: validCourses, regulationId: selectedRegulation });
          const response = await api.post(`${API_BASE}/regulations/courses`, {
            courses: validCourses,
            regulationId: selectedRegulation,
          });
          console.log('API response:', response);
          console.log('Response status:', response.status);
          console.log('Response data:', response.data);
          console.log('Success message:', response.data?.message || 'Courses added to regulation successfully');

          // Verify successful status code
          if (response.status < 200 || response.status >= 300) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          // Show SweetAlert2 success popup
          await Swal.fire({
            icon: 'success',
            title: 'Success',
            text: response.data?.message || 'Courses added to regulation successfully',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
            position: 'center',
          });

          setFile(null);
          await fetchAvailableCourses(selectedRegulation);
        } catch (err) {
          console.error('XLSX processing error:', err);
          toast.error('Failed to process Excel file: ' + (err.message || 'Unknown error'), { toastId: 'import-error' });
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('File reading error:', err);
      toast.error('Error reading Excel file: ' + (err.message || 'Unknown error'), { toastId: 'file-read-error' });
      setIsImporting(false);
    }
  };

  const determineCourseType = (lectureHours, tutorialHours, practicalHours, experientialHours) => {
    if (experientialHours > 0) return 'EXPERIENTIAL LEARNING';
    if (practicalHours > 0) {
      if (lectureHours > 0 || tutorialHours > 0) return 'INTEGRATED';
      return 'PRACTICAL';
    }
    return 'THEORY';
  };

  const handleCourseSelection = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleAllocateCourses = async () => {
    if (!selectedVertical || selectedVertical === 'add') {
      toast.error('Please select a valid vertical', { toastId: 'invalid-vertical' });
      return;
    }
    if (selectedCourses.length === 0) {
      toast.error('Please select at least one course', { toastId: 'no-courses-selected' });
      return;
    }

    try {
      const response = await api.post(`${API_BASE}/regulations/verticals/courses`, {
        verticalId: selectedVertical,
        regCourseIds: selectedCourses,
      });
      toast.success(response.data.message, { toastId: 'allocate-success' });
      setSelectedCourses([]);
      await fetchAvailableCourses(selectedRegulation);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error allocating courses', { toastId: 'allocate-error' });
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6 text-red-500 text-center">{error}</div>;

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Regulations</h1>
              <p className="text-gray-600 mt-1">Import courses and manage verticals for regulations</p>
            </div>
            <button
              onClick={() => setShowAddVerticalModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
            >
              <Plus size={18} />
              Add Vertical
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={selectedDept}
                  onChange={handleDeptChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.Deptid} value={dept.Deptid}>
                      {dept.Deptname} ({dept.deptCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Regulation</label>
                <select
                  value={selectedRegulation}
                  onChange={handleRegulationChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!selectedDept}
                >
                  <option value="">Select Regulation</option>
                  {regulations.map(reg => (
                    <option key={reg.regulationId} value={reg.regulationId}>
                      {reg.Deptacronym} - {reg.regulationYear}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Courses</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Excel File</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-center">
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {file ? (
                          <span className="font-medium text-blue-600">{file.name}</span>
                        ) : (
                          <>
                            <span className="font-medium text-gray-700">Click to upload</span>
                            <span className="text-gray-500"> or drag and drop</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">XLS or XLSX files only</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={downloadTemplate}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Download size={18} />
                  Download Template
                </button>
                <button
                  onClick={handleImport}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={!selectedRegulation || !file || isImporting}
                >
                  <Upload size={18} />
                  {isImporting ? 'Importing...' : 'Import Courses'}
                </button>
              </div>
            </div>
          </div>

          {selectedRegulation && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Allocate Courses to Vertical</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Vertical</label>
                  <select
                    value={selectedVertical}
                    onChange={handleVerticalChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Vertical</option>
                    {verticals.map(vertical => (
                      <option key={vertical.verticalId} value={vertical.verticalId}>
                        {vertical.verticalName}
                      </option>
                    ))}
                    <option value="add">Add New Vertical</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleAllocateCourses}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!selectedVertical || selectedCourses.length === 0 || selectedVertical === 'add'}
                  >
                    <Plus size={18} />
                    Allocate Courses ({selectedCourses.length})
                  </button>
                </div>
              </div>

              {selectedVertical && selectedVertical !== 'add' && (
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-3">
                    Available PEC/OEC Courses
                  </h3>
                  {availableCourses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      No available PEC/OEC courses for this regulation.
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                      {availableCourses.map(course => (
                        <label
                          key={course.courseId}
                          className="flex items-center p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(course.courseId)}
                            onChange={() => handleCourseSelection(course.courseId)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="ml-3 text-sm text-gray-800">
                            <span className="font-medium">{course.courseCode}</span> - {course.courseTitle}
                            <span className="text-gray-500 ml-2">
                              (Semester {course.semesterNumber}, {course.category})
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {(showAddVerticalModal || selectedVertical === 'add') && (
          <AddVerticalModal
            regulationId={selectedRegulation}
            setShowAddVerticalModal={setShowAddVerticalModal}
            onVerticalAdded={() => {
              fetchVerticals(selectedRegulation);
              setSelectedVertical('');
            }}
          />
        )}
      </div>
    </>
  );
};

export default ManageRegulations;