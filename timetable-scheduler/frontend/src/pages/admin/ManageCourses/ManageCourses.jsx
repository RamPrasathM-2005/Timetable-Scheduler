import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners'; // Import the spinner
import { api } from '../../../services/authService';
import * as XLSX from 'xlsx';
import Filters from './Filters.jsx';
import CourseCard from './CourseCard.jsx';
import CourseForm from '../ManageSemesters/CourseForm.jsx';
import CourseDetailsModal from './CourseDetailsModal.jsx';
import AddBatchModal from './AddBatchModal.jsx';
import AllocateStaffModal from './AllocateStaffModal.jsx';
import SelectSemesterModal from './SelectSemesterModal.jsx';
import ImportModal from './ImportModal.jsx';

const API_BASE = 'http://localhost:4000/api/admin';

const deptNameMap = {
  1: 'Computer Science Engineering',
  2: 'Electronics and Communication Engineering',
  3: 'Mechanical Engineering',
};

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [sections, setSections] = useState({});
  const [fetchingSections, setFetchingSections] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ dept: '', semester: '', batch: '', name: '', type: '' });
  const [staffSearch, setStaffSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAllocateStaffModal, setShowAllocateStaffModal] = useState(false);
  const [showCourseDetailsModal, setShowCourseDetailsModal] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [newBatchForm, setNewBatchForm] = useState({ numberOfBatches: 1 });
  const [updateKey, setUpdateKey] = useState(0); // Force re-render

  const courseTypes = ['THEORY', 'PRACTICAL', 'INTEGRATED', 'EXPERIENTIAL LEARNING'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const semRes = await api.get(`${API_BASE}/semesters`);
      const semestersData = semRes.data.data || [];
      setSemesters(semestersData);

      let allCourses = [];
      for (const semester of semestersData) {
        try {
          const courseRes = await api.get(`${API_BASE}/semesters/${semester.semesterId}/courses`);
          if (courseRes.data.status === 'success' && Array.isArray(courseRes.data.data)) {
            const semesterCourses = courseRes.data.data.map(course => ({
              ...course,
              semesterDetails: semester,
            }));
            allCourses = [...allCourses, ...semesterCourses];
          }
        } catch (err) {
          const message = err.response?.data?.message || `Failed to fetch courses for semester ${semester.semesterId}`;
          toast.warn(message);
          if (message.includes('Unknown column')) {
            toast.warn('Database configuration issue detected. Please check server settings.');
          }
        }
      }
      allCourses.sort((a, b) => b.courseId - a.courseId);
      setCourses(allCourses);

      const sectionsData = {};
      for (const course of allCourses) {
        try {
          const sectionRes = await api.get(`${API_BASE}/courses/${course.courseId}/sections`);
          // console.log(`ManageCourses: Sections API response for course ${course.courseId}:`, sectionRes.data);
          if (sectionRes.data?.status === 'success' && Array.isArray(sectionRes.data.data)) {
            const batches = sectionRes.data.data.reduce((acc, section) => {
              if (section.sectionName) {
                const normalizedName = section.sectionName.replace('BatchBatch', 'Batch');
                acc[normalizedName] = [];
              }
              return acc;
            }, {});
            sectionsData[String(course.courseId)] = batches;

            const staffRes = await api.get(`${API_BASE}/courses/${course.courseId}/staff`);
            // console.log(`ManageCourses: Staff API response for course ${course.courseId}:`, staffRes.data);
            if (staffRes.data?.status === 'success' && Array.isArray(staffRes.data.data)) {
              staffRes.data.data.forEach(alloc => {
                const normalizedName = alloc.sectionName.replace('BatchBatch', 'Batch');
                if (batches[normalizedName]) {
                  batches[normalizedName].push({
                    staffId: alloc.Userid,
                    staffName: alloc.staffName,
                    staffCourseId: alloc.staffCourseId,
                    sectionId: alloc.sectionId,
                    sectionName: normalizedName,
                    departmentId: alloc.departmentId,
                    departmentName: alloc.departmentName || deptNameMap[alloc.departmentId] || 'Unknown',
                  });
                }
              });
            }
            sectionsData[String(course.courseId)] = batches;
          } else {
            sectionsData[String(course.courseId)] = {};
            // console.warn(`ManageCourses: No sections found for course ${course.courseId}`);
          }
        } catch (err) {
          sectionsData[String(course.courseId)] = {};
          // console.error(`ManageCourses: Error fetching sections for course ${course.courseId}:`, err.response?.data || err);
          // toast.warn(`Failed to fetch sections for course ${course.courseCode}: ${err.response?.data?.message || err.message}`);
        }
      }
      setSections(sectionsData);
      
      const usersRes = await api.get(`${API_BASE}/users`);
      let staffData = usersRes.data.data.filter(user => user.departmentId);
      staffData = staffData.map(user => ({
        id: user.id || user.Userid,
        name: user.name || 'Unknown',
        departmentId: user.departmentId,
        departmentName: user.departmentName || deptNameMap[user.departmentId] || 'Unknown',
      }));
      const uniqueStaff = staffData.filter((staff, index, self) =>
        index === self.findIndex(s => s.id === staff.id)
      );
      setStaffList(uniqueStaff);
      toast.success('Fetched all data successfully');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch data';
      setError(message);
      toast.error(message);
      if (err.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (message.includes('Unknown column')) {
        toast.warn('Database configuration issue detected. Please check server settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStaff = () => {
    return staffList.filter(staff =>
      (staff.name || '').toLowerCase().includes(staffSearch.toLowerCase()) ||
      String(staff.id || '').toLowerCase().includes(staffSearch.toLowerCase()) ||
      (staff.departmentName || '').toLowerCase().includes(staffSearch.toLowerCase())
    );
  };

  const fetchCourseStaff = async (courseId) => {
    setFetchingSections(true);
    try {
      const course = courses.find(c => c.courseId === courseId);
      if (!course) {
        toast.error('Course not found');
        return;
      }

      const sectionRes = await Promise.race([
        api.get(`${API_BASE}/courses/${course.courseId}/sections`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
      ]);
      
      if (sectionRes.data?.status !== 'success' || !Array.isArray(sectionRes.data.data)) {
        setSections(prev => {
          const newState = { ...prev, [String(courseId)]: {} };
          return newState;
        });
        toast.warn('No sections found for this course');
        return;
      }

      const batches = sectionRes.data.data.reduce((acc, section) => {
        if (section.sectionName) {
          const normalizedName = section.sectionName.replace('BatchBatch', 'Batch');
          acc[normalizedName] = [];
        }
        return acc;
      }, {});

      const staffRes = await api.get(`${API_BASE}/courses/${course.courseId}/staff`);
      
      if (staffRes.data?.status === 'success' && Array.isArray(staffRes.data.data)) {
        staffRes.data.data.forEach(alloc => {
          const normalizedName = alloc.sectionName.replace('BatchBatch', 'Batch');
          if (batches[normalizedName]) {
            batches[normalizedName].push({
              staffId: alloc.Userid,
              staffName: alloc.staffName,
              staffCourseId: alloc.staffCourseId,
              sectionId: alloc.sectionId,
              sectionName: normalizedName,
              departmentId: alloc.departmentId,
              departmentName: alloc.departmentName || deptNameMap[alloc.departmentId] || 'Unknown',
            });
          }
        });
      }

      setSections(prev => {
        const newState = { ...prev, [String(courseId)]: batches };
        setUpdateKey(prev => prev + 1); 
        return newState;
      });
      setSelectedCourse(prev => ({
        ...prev,
        courseId,
        courseCode: course.courseCode,
        allocations: staffRes.data.data || [],
      }));
      toast.success('Fetched course staff successfully');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error fetching course staff';
      toast.error(message);
      if (err.response?.status === 404) {
        toast.error(`Course with ID ${courseId} not found`);
      } else if (err.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (message.includes('Unknown column')) {
        toast.warn('Database configuration issue detected. Please check server settings.');
      }
      setSections(prev => {
        const newState = { ...prev, [String(courseId)]: {} };
        return newState;
      });
    } finally {
      setFetchingSections(false);
    }
  };

  const handleAllocateStaff = async (staffId) => {
    await fetchCourseStaff(selectedCourse.courseId);
    setUpdateKey(prev => prev + 1);
  };

  const handleDeleteBatch = async (courseId, sectionName) => {
    // Optimistic update
    setSections(prev => {
      const normalizedName = sectionName.replace('BatchBatch', 'Batch');
      const updatedBatches = { ...prev[String(courseId)] };
      delete updatedBatches[normalizedName];
      const newState = { ...prev, [String(courseId)]: updatedBatches };
      setUpdateKey(prev => prev + 1);
      return newState;
    });

    await fetchCourseStaff(courseId);
  };

  const handleDeleteStaff = async (staffCourseId) => {
    await fetchCourseStaff(selectedCourse.courseId);
    setUpdateKey(prev => prev + 1);
  };

  const handleEditStaff = (staffCourseId) => {
    const allocation = selectedCourse.allocations.find(a => a.staffCourseId === staffCourseId);
    if (allocation) {
      setSelectedBatch(allocation.sectionName.replace('BatchBatch', 'Batch'));
      setStaffSearch(allocation.staffName);
      setShowAllocateStaffModal(true);
      setShowCourseDetailsModal(false);
    }
  };

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setShowCourseDetailsModal(true);
    fetchCourseStaff(course.courseId);
  };

  const handleDeleteCourse = async (courseId) => {
    setCourses(prev => prev.filter(course => course.courseId !== courseId));
    setSections(prev => {
      const newState = { ...prev };
      delete newState[String(courseId)];
      return newState;
    });
    setUpdateKey(prev => prev + 1);
  };

  const getCourseTypeColor = (type) => {
    const colors = {
      'THEORY': 'bg-blue-100 text-blue-800',
      'PRACTICAL': 'bg-green-100 text-green-800',
      'INTEGRATED': 'bg-purple-100 text-purple-800',
      'EXPERIENTIAL LEARNING': 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const openCreateModal = () => {
    setSelectedSemesterId('');
    setShowCreateModal(true);
  };

  const handleNextToForm = () => {
    if (!selectedSemesterId) {
      toast.error('Please select a semester');
      return;
    }
    setShowCreateModal(false);
    setShowCourseForm(true);
  };

  const handleAddBatch = async () => {
    await fetchCourseStaff(selectedCourse.courseId);
    setUpdateKey(prev => prev + 1);
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);
    setShowEditModal(true);
  };

  const handleImport = async (file, semesterId) => {
    if (!file) {
      toast.error('No file selected');
      return;
    }

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid Excel file (.xls or .xlsx)');
      return;
    }

    toast.info('Processing Excel file...');

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
          const headers = jsonData[0] ? jsonData[0].map(h => h.toString().trim()) : [];

          if (!headers.every((header, index) => header === expectedHeaders[index])) {
            toast.error('Invalid Excel format. Please use the correct column headers.');
            return;
          }

          const coursesData = jsonData.slice(1).filter(row => row && row.length >= 12).map((row, index) => {
            const rawCategory = row[3]?.toString() || '';
            const category = rawCategory.trim().toUpperCase();

            return {
              courseCode: row[1]?.toString().trim(),
              courseTitle: row[2]?.toString().trim(),
              category: category,
              lectureHours: parseInt(row[4]) || 0,
              tutorialHours: parseInt(row[5]) || 0,
              practicalHours: parseInt(row[6]) || 0,
              experientialHours: parseInt(row[7]) || 0,
              totalContactPeriods: parseInt(row[8]),
              credits: parseInt(row[9]),
              minMark: parseInt(row[10]),
              maxMark: parseInt(row[11]),
              semesterId: semesterId,
              isActive: 'YES',
              type: determineCourseType(parseInt(row[4]) || 0, parseInt(row[5]) || 0, parseInt(row[6]) || 0, parseInt(row[7]) || 0),
            };
          });

          const validTypes = ['THEORY', 'PRACTICAL', 'INTEGRATED', 'EXPERIENTIAL LEARNING'];
          const validCategories = ['HSMC', 'BSC', 'ESC', 'PEC', 'OEC', 'EEC', 'PCC'];

          for (const course of coursesData) {
            if (
              !course.courseCode ||
              !course.courseTitle ||
              !course.category ||
              !validCategories.includes(course.category) ||
              !validTypes.includes(course.type) ||
              isNaN(course.minMark) ||
              isNaN(course.maxMark) ||
              isNaN(course.lectureHours) ||
              isNaN(course.tutorialHours) ||
              isNaN(course.practicalHours) ||
              isNaN(course.experientialHours) ||
              isNaN(course.totalContactPeriods) ||
              isNaN(course.credits) ||
              course.minMark > course.maxMark ||
              course.minMark < 0 ||
              course.maxMark < 0
            ) {
              toast.error(`Invalid data in row for course ${course.courseCode || 'unknown'}`);
              return;
            }
          }

          toast.info(`Sending ${coursesData.length} courses to backend...`);

          const response = await api.post(`${API_BASE}/courses`, { courses: coursesData });
          toast.success(`Imported ${response.data.importedCount} courses successfully`);
          fetchData();
          setUpdateKey(prev => prev + 1);
        } catch (readerError) {
          toast.error('Error processing Excel file: ' + readerError.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('FileReader error:', err);
      toast.error('Error reading Excel file: ' + err.message);
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

  // UPDATED LOADING STATE
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <ClipLoader color="#2563EB" size={50} />
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Courses...</p>
      </div>
    );
  }

  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const filteredCourses = courses.filter(course => {
    const { dept, semester, batch, name, type } = filters;
    const semDetails = course.semesterDetails;
    return (
      (!dept || semDetails?.branch === dept) &&
      (!semester || semDetails?.semesterNumber.toString() === semester) &&
      (!batch || semDetails?.batch === batch) &&
      (!name || course.courseTitle.toLowerCase().includes(name.toLowerCase())) &&
      (!type || course.type === type)
    );
  });

  const displayCourses = Object.keys(filters).some(key => filters[key]) ? filteredCourses : courses;

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center" key={updateKey}>
      <div className="w-full max-w-7xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900">Manage Courses</h1>
            <p className="text-gray-600 mt-1">Create, edit, and manage academic courses with batches and staff</p>
          </div>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <button
              onClick={openCreateModal}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg font-semibold"
            >
              <Plus size={20} />
              Add Course
            </button>
            <button
              onClick={() => {
                setShowImportModal(true);
              }}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg font-semibold"
            >
              <Upload size={20} />
              Import
            </button>
          </div>
        </div>
        <Filters
          filters={filters}
          setFilters={setFilters}
          semesters={semesters}
          courseTypes={courseTypes}
        />
      </div>
      <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCourses.map(course => (
          <CourseCard
            key={course.courseId}
            course={course}
            sections={sections}
            getCourseTypeColor={getCourseTypeColor}
            handleCourseClick={handleCourseClick}
            handleDeleteCourse={handleDeleteCourse}
            openEditModal={openEditModal}
          />
        ))}
      </div>
      {displayCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500">Try adjusting your filters or create a new course.</p>
        </div>
      )}
      {showCreateModal && (
        <SelectSemesterModal
          semesters={semesters}
          selectedSemesterId={selectedSemesterId}
          setSelectedSemesterId={setSelectedSemesterId}
          setShowCreateModal={setShowCreateModal}
          handleNextToForm={handleNextToForm}
        />
      )}
      {showCourseForm && (
        <CourseForm
          isOpen={showCourseForm}
          onClose={() => {
            setShowCourseForm(false);
            setSelectedSemesterId('');
            fetchData();
          }}
          semesterId={selectedSemesterId}
          course={null}
          onRefresh={fetchData}
        />
      )}
      {showEditModal && selectedCourse && (
        <CourseForm
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            fetchData();
          }}
          semesterId={selectedCourse.semesterId}
          course={selectedCourse}
          onRefresh={fetchData}
        />
      )}
      {showAddBatchModal && selectedCourse && (
        <AddBatchModal
          selectedCourse={selectedCourse}
          newBatchForm={newBatchForm}
          setNewBatchForm={setNewBatchForm}
          handleAddBatch={handleAddBatch}
          setShowAddBatchModal={setShowAddBatchModal}
          setShowCourseDetailsModal={setShowCourseDetailsModal}
          setSections={setSections}
        />
      )}
      {showCourseDetailsModal && selectedCourse && (
        <CourseDetailsModal
          selectedCourse={selectedCourse}
          sections={sections}
          fetchingSections={fetchingSections}
          setShowCourseDetailsModal={setShowCourseDetailsModal}
          setSections={setSections}
          openEditModal={openEditModal}
          setShowAddBatchModal={setShowAddBatchModal}
          handleDeleteBatch={handleDeleteBatch}
          handleEditStaff={handleEditStaff}
          handleDeleteStaff={handleDeleteStaff}
          setSelectedBatch={setSelectedBatch}
          setShowAllocateStaffModal={setShowAllocateStaffModal}
        />
      )}
      {showAllocateStaffModal && selectedCourse && selectedBatch && (
        <AllocateStaffModal
          selectedCourse={selectedCourse}
          selectedBatch={selectedBatch}
          staffSearch={staffSearch}
          setStaffSearch={setStaffSearch}
          getFilteredStaff={getFilteredStaff}
          handleAllocateStaff={handleAllocateStaff}
          setShowAllocateStaffModal={setShowAllocateStaffModal}
          setShowCourseDetailsModal={setShowCourseDetailsModal}
        />
      )}
      {showImportModal && (
        <ImportModal
          semesters={semesters}
          setShowImportModal={setShowImportModal}
          onImport={handleImport}
        />
      )}
    </div>
  );
};

export default ManageCourses;