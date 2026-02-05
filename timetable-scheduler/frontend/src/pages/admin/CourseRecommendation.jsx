import React, { useState, useEffect, useRef } from 'react';
import { Select, Card, Button, Table, Collapse, Input, Space, Checkbox } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { api } from '../../services/authService';
import { degrees, branchMap } from '../admin/ManageSemesters/branchMap';
import AddBucketModal from './addBucketModal';
import Swal from 'sweetalert2';

const { Option } = Select;

const CourseRecommendation = () => {
  const [batches, setBatches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState('');
  const [selectedRegulationId, setSelectedRegulationId] = useState('');
  const [pccCourses, setPccCourses] = useState([]);
  const [electives, setElectives] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [courseInfo, setCourseInfo] = useState({});
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddBucketModal, setShowAddBucketModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVerticalPerBucket, setSelectedVerticalPerBucket] = useState({});
  const [selectedCoursesPerBucket, setSelectedCoursesPerBucket] = useState({});

  useEffect(() => {
    console.log('Current state:', {
      loading,
      selectedDegree,
      selectedDept,
      selectedBatch,
      selectedSemester,
      selectedRegulationId,
      selectedSemesterNumber,
      semesters,
    });
  }, [loading, selectedDegree, selectedDept, selectedBatch, selectedSemester, selectedRegulationId, selectedSemesterNumber, semesters]);

  useEffect(() => {
    const fetchInitialData = async () => {
      console.log('Fetching initial data, setting loading to true');
      setLoading(true);
      try {
        const batchRes = await api.get('/admin/batches');
        console.log('Batches response:', batchRes.data);
        if (batchRes.data.status === 'success') {
          setBatches([...new Set(batchRes.data.data.map(b => b.batch))]);
        } else {
          throw new Error(batchRes.data.message || 'Failed to fetch batches');
        }
      } catch (err) {
        const errorMessage = `Failed to fetch initial data: ${err.message}`;
        console.error('Batch fetch error:', err.response?.data || err);
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        console.log('Finished fetching initial data, setting loading to false');
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedDegree || !selectedDept || !selectedBatch) return;
    const fetchBatchAndSemesters = async () => {
      setLoading(true);
      setError(null);
      try {
        const batchParams = { degree: selectedDegree, branch: selectedDept, batch: selectedBatch };
        console.log('Fetching batch with params:', batchParams);
        const batchRes = await api.get('/admin/batches/find', { params: batchParams });
        console.log('Batch API response:', batchRes.data);
        if (batchRes.data.status === 'success') {
          const regulationId = batchRes.data.data.regulationId;
          console.log('Selected Regulation ID:', regulationId);
          if (!regulationId) {
            console.warn('No regulationId found in batch response');
            setError('No regulation assigned to this batch. Please assign a regulation.');
            toast.warn('No regulation assigned to this batch. Some features may be limited.');
          }
          setSelectedRegulationId(regulationId || '');
        } else {
          throw new Error(batchRes.data.message || 'Batch not found');
        }

        const semParams = { degree: selectedDegree, branch: selectedDept, batch: selectedBatch };
        console.log('Fetching semesters with params:', semParams);
        const semRes = await api.get('/admin/semesters/by-batch-branch', { params: semParams });
        console.log('Semester response:', semRes.data);
        if (semRes.data.status === 'success') {
          setSemesters(semRes.data.data);
          console.log('Semesters set:', semRes.data.data);
          if (semRes.data.data.length === 0) {
            setError('No semesters found. Please create a semester.');
            toast.info('No semesters found. Please create a semester.');
          }
        } else {
          throw new Error(semRes.data.message || 'Failed to fetch semesters');
        }
      } catch (err) {
        const errorMessage =
          err.response?.status === 404
            ? `No batch or semesters found for ${selectedDegree} - ${selectedDept} (${selectedBatch}). Create batch/semester first.`
            : `Failed to fetch: ${err.response?.data?.message || err.message}`;
        console.error('Fetch error:', err.response?.data || err);
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchBatchAndSemesters();
  }, [selectedDegree, selectedDept, selectedBatch]);

  // NEW: Main data fetching when semester is selected
  useEffect(() => {
    if (!selectedSemester || !selectedRegulationId || !selectedSemesterNumber) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        // 1. Fetch core (PCC) courses
        const courseRes = await api.get(`/admin/semesters/${selectedSemester}/courses`);
        if (courseRes.data.status === 'success') {
          setPccCourses(courseRes.data.data.filter(c => c.category === 'PCC'));
        }

        // 2. Fetch buckets (with fixed vertical display)
        const bucketRes = await api.get(`/admin/semesters/${selectedSemester}/buckets`);
        if (bucketRes.data.status === 'success') {
          setBuckets(bucketRes.data.data);
        }

        // 3. Fetch verticals for dropdown
        const verticalRes = await api.get(`/admin/regulations/${selectedRegulationId}/verticals`);
        if (verticalRes.data.status === 'success') {
          setVerticals(verticalRes.data.data);
        }

        // 4. NEW: Fetch ALL PEC/OEC (assigned + unassigned OEC) for this semester
        const electivesRes = await api.get(
          `/admin/regulations/${selectedRegulationId}/electives/${selectedSemesterNumber}`
        );
        if (electivesRes.data.status === 'success') {
          const formattedElectives = electivesRes.data.data.map(course => ({
            ...course,
            verticalId: course.verticalId || null,
            verticalName: course.verticalName || 'Unassigned'
          }));
          setElectives(formattedElectives);
          console.log('✅ All electives loaded (assigned + unassigned OEC):', formattedElectives);
        } else {
          console.warn('No electives data received');
          setElectives([]);
        }

      } catch (err) {
        console.error('❌ Error loading semester data:', err);
        const errorMessage = err.response?.data?.message || err.message;
        setError(`Failed to load courses/buckets/electives: ${errorMessage}`);
        toast.error(`Failed to load data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedSemester, selectedRegulationId, selectedSemesterNumber]);

  useEffect(() => {
    console.log('Semester selection:', { selectedSemester, semesters });
    if (selectedSemester) {
      const sem = semesters.find(s => s.semesterId === selectedSemester);
      if (sem) {
        setSelectedSemesterNumber(sem.semesterNumber.toString());
        console.log('Selected Semester Number:', sem.semesterNumber);
      } else {
        console.warn('No semester found for selectedSemester:', selectedSemester);
      }
    }
  }, [selectedSemester, semesters]);

  useEffect(() => {
    const info = {};
    electives.forEach(e => {
      info[e.courseCode] = {
        verticalId: e.verticalId,
        verticalName: e.verticalName,
        courseTitle: e.courseTitle,
      };
    });
    setCourseInfo(info);
    console.log('CourseInfo set:', info);
  }, [electives]);

  const handleAddBucket = () => {
    console.log('handleAddBucket called', { selectedSemester, selectedRegulationId, selectedSemesterNumber });
    if (!selectedSemester || !selectedRegulationId || !selectedSemesterNumber) {
      toast.error('Please select Degree, Department, Batch, and Semester first');
      return;
    }
    console.log('Setting showAddBucketModal to true');
    setShowAddBucketModal(true);
  };

  const handleBucketAdded = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/semesters/${selectedSemester}/buckets`);
      console.log('Updated buckets response:', res.data);
      if (res.data.status === 'success') {
        setBuckets(res.data.data);
        toast.success('Bucket created successfully');
      }
    } catch (err) {
      setError(`Failed to fetch updated buckets: ${err.response?.data?.message || err.message}`);
      toast.error(`Failed to fetch updated buckets: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBucketName = async (bucketId, newName) => {
    if (!newName.trim()) {
      toast.error('Bucket name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put(`/admin/buckets/${bucketId}`, { bucketName: newName });
      if (res.data.status === 'success') {
        setBuckets(buckets.map(b => (b.bucketId === bucketId ? { ...b, bucketName: newName } : b)));
        toast.success('Bucket name updated successfully');
      }
    } catch (err) {
      setError(`Failed to update bucket name: ${err.response?.data?.message || err.message}`);
      toast.error(`Failed to update bucket name: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBucket = async (bucketId) => {
    const result = await Swal.fire({
      title: 'Delete Bucket',
      text: 'Are you sure you want to delete this bucket?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      const res = await api.delete(`/admin/buckets/${bucketId}`);
      if (res.data.status === 'success') {
        setBuckets(buckets.filter(b => b.bucketId !== bucketId));
        toast.success('Bucket deleted successfully');
      }
    } catch (err) {
      setError(`Failed to delete bucket: ${err.response?.data?.message || err.message}`);
      toast.error(`Failed to delete bucket: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerticalSelect = (bucketId, value) => {
    setSelectedVerticalPerBucket(prev => ({ ...prev, [bucketId]: value }));
    setSelectedCoursesPerBucket(prev => ({ ...prev, [bucketId]: [] }));
  };

  const handleCourseSelect = (bucketId, checked) => {
    setSelectedCoursesPerBucket(prev => ({ ...prev, [bucketId]: checked }));
  };

  const handleAddSelectedCourses = async (bucketId) => {
    const selected = selectedCoursesPerBucket[bucketId] || [];
    if (!selected.length) {
      toast.error('Please select at least one course');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`/admin/buckets/${bucketId}/courses`, { courseCodes: selected });
      if (res.data.status === 'success') {
        const bucketRes = await api.get(`/admin/semesters/${selectedSemester}/buckets`);
        if (bucketRes.data.status === 'success') {
          setBuckets(bucketRes.data.data);
          toast.success(`✅ ${res.data.addedCourses?.length || selected.length} courses added to bucket!`);
          setSelectedVerticalPerBucket(prev => ({ ...prev, [bucketId]: undefined }));
          setSelectedCoursesPerBucket(prev => ({ ...prev, [bucketId]: [] }));
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      console.error('Add courses error:', err.response?.data);
      setError(`Failed to add courses: ${errorMsg}`);
      toast.error(`Failed to add courses: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCourseFromBucket = async (bucketId, courseCode) => {
    const result = await Swal.fire({
      title: 'Remove Course',
      text: `Are you sure you want to remove ${courseCode} from the bucket?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      const res = await api.delete(`/admin/buckets/${bucketId}/courses/${courseCode}`);
      if (res.data.status === 'success') {
        const bucketRes = await api.get(`/admin/semesters/${selectedSemester}/buckets`);
        if (bucketRes.data.status === 'success') {
          setBuckets(bucketRes.data.data);
          toast.success(`✅ Course ${courseCode} removed successfully`);
        }
      }
    } catch (err) {
      setError(`Failed to remove course: ${err.response?.data?.message || err.message}`);
      toast.error(`Failed to remove course: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRecommendation = () => {
    setShowPreview(true);
  };

  const assignedCourses = buckets.flatMap(bucket => bucket.courses.map(c => c.courseCode));

  const pccColumns = [
    { title: 'Course Code', dataIndex: 'courseCode', key: 'courseCode' },
    { title: 'Course Title', dataIndex: 'courseTitle', key: 'courseTitle' },
  ];

  const getGroupedCourses = (courses) => {
    return courses.reduce((acc, c) => {
      const v = c.verticalName || 'Unassigned';
      if (!acc[v]) acc[v] = [];
      acc[v].push(c);
      return acc;
    }, {});
  };

  const collapseItems = buckets.map(bucket => ({
    key: bucket.bucketId,
    label: (
      <div className="flex justify-between items-center">
        <Input
          defaultValue={bucket.bucketName || `Elective ${bucket.bucketNumber}`}
          onBlur={e => handleUpdateBucketName(bucket.bucketId, e.target.value)}
          style={{ width: 200, marginRight: 8 }}
        />
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={e => {
            e.stopPropagation();
            handleDeleteBucket(bucket.bucketId);
          }}
        >
          Delete
        </Button>
      </div>
    ),
    children: (
      <>
        {bucket.courses.length > 0 ? (
          Object.entries(getGroupedCourses(bucket.courses)).map(([vertical, courses]) => (
            <div key={vertical}>
              <h4 className="font-semibold text-blue-600">{vertical}</h4>
              <ul className="space-y-2 mb-4">
                {courses.map(c => (
                  <li key={c.courseCode} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">
                      {c.courseCode} - {c.courseTitle}
                    </span>
                    <Button
                      danger
                      size="small"
                      onClick={() => handleRemoveCourseFromBucket(bucket.bucketId, c.courseCode)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">No courses in this bucket. Add some electives below!</p>
        )}
        
        {/* UPDATED: Added Unassigned option */}
        <Select
          placeholder="Select Vertical (or Unassigned for OEC)"
          style={{ width: '100%', marginBottom: 16 }}
          value={selectedVerticalPerBucket[bucket.bucketId]}
          onChange={value => handleVerticalSelect(bucket.bucketId, value)}
          disabled={loading || verticals.length === 0}
        >
          <Option value={null}>📌 Unassigned (OEC only)</Option>
          {verticals.map(v => (
            <Option key={v.verticalId} value={v.verticalId}>
              {v.verticalName}
            </Option>
          ))}
        </Select>

        {selectedVerticalPerBucket[bucket.bucketId] !== undefined && (
          <div>
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <strong>Available Courses ({electives.filter(e => {
                const sel = selectedVerticalPerBucket[bucket.bucketId];
                if (sel === null) {
                  return e.verticalId === null && e.category === 'OEC';
                }
                return e.verticalId === sel;
              }).length} found):</strong>
            </div>
            <Checkbox.Group
              style={{ width: '100%' }}
              value={selectedCoursesPerBucket[bucket.bucketId] || []}
              onChange={checked => handleCourseSelect(bucket.bucketId, checked)}
            >
              {electives
                .filter(e => {
                  const sel = selectedVerticalPerBucket[bucket.bucketId];
                  if (sel === null) {
                    // Show only unassigned OEC
                    return e.verticalId === null && e.category === 'OEC' && !assignedCourses.includes(e.courseCode);
                  }
                  // Show courses from selected vertical
                  return e.verticalId === sel && !assignedCourses.includes(e.courseCode);
                })
                .map(e => (
                  <Checkbox
                    key={e.courseCode}
                    value={e.courseCode}
                    style={{ display: 'block', marginBottom: 8, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#f9fafb' }}
                  >
                    <div>
                      <strong>{e.courseCode}</strong> - {e.courseTitle}
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        e.verticalName === 'Unassigned' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {e.verticalName} ({e.category})
                      </span>
                    </div>
                  </Checkbox>
                ))}
            </Checkbox.Group>
            {electives.filter(e => {
              const sel = selectedVerticalPerBucket[bucket.bucketId];
              if (sel === null) return e.verticalId === null && e.category === 'OEC';
              return e.verticalId === sel;
            }).length === 0 && (
              <p className="text-gray-500 mt-2 italic">No available courses for this selection.</p>
            )}
            <Button
              type="primary"
              onClick={() => handleAddSelectedCourses(bucket.bucketId)}
              disabled={loading || !(selectedCoursesPerBucket[bucket.bucketId]?.length > 0)}
              className="mt-3 w-full"
            >
              ✅ Add {selectedCoursesPerBucket[bucket.bucketId]?.length || 0} Selected Courses
            </Button>
          </div>
        )}
      </>
    ),
  }));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">Course Recommendation</h1>
      {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}
      {loading && <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">🔄 Loading courses, buckets, and electives...</div>}

      <Card className="mb-6">
        <Space wrap>
          <div>
            <label className="block mb-1 font-medium">Degree</label>
            <Select
              value={selectedDegree}
              onChange={(value) => {
                console.log('Selected Degree:', value);
                setSelectedDegree(value);
                setSelectedDept('');
                setSelectedBatch('');
                setSelectedSemester('');
                setSelectedRegulationId('');
                setSelectedSemesterNumber('');
                setSemesters([]);
                setElectives([]);
                setVerticals([]);
              }}
              disabled={loading}
              style={{ width: 200 }}
              placeholder="Select Degree"
            >
              {degrees.map(deg => (
                <Option key={deg} value={deg}>
                  {deg}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Department</label>
            <Select
              value={selectedDept}
              onChange={(value) => {
                console.log('Selected Dept:', value);
                setSelectedDept(value);
                setSelectedBatch('');
                setSelectedSemester('');
                setSelectedRegulationId('');
                setSelectedSemesterNumber('');
                setSemesters([]);
                setElectives([]);
                setVerticals([]);
              }}
              disabled={loading || !selectedDegree}
              style={{ width: 200 }}
              placeholder="Select Department"
            >
              {Object.entries(branchMap).map(([acronym, deptname]) => (
                <Option key={acronym} value={acronym}>
                  {deptname}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Batch</label>
            <Select
              value={selectedBatch}
              onChange={(value) => {
                console.log('Selected Batch:', value);
                setSelectedBatch(value);
                setSelectedSemester('');
                setSelectedRegulationId('');
                setSelectedSemesterNumber('');
                setSemesters([]);
                setElectives([]);
                setVerticals([]);
              }}
              disabled={loading || !selectedDegree || !selectedDept}
              style={{ width: 200 }}
              placeholder="Select Batch"
            >
              {batches.map(b => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Semester</label>
            <Select
              value={selectedSemester}
              onChange={(value) => {
                console.log('Selected Semester:', value);
                setSelectedSemester(value);
                setElectives([]);
                setVerticals([]);
              }}
              disabled={loading || !selectedDegree || !selectedDept || !selectedBatch}
              style={{ width: 200 }}
              placeholder="Select Semester"
            >
              {semesters.map(s => (
                <Option key={s.semesterId} value={s.semesterId}>
                  Semester {s.semesterNumber}
                </Option>
              ))}
            </Select>
          </div>
        </Space>
      </Card>

      {selectedSemester && (
        <>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Core Courses (PCC)</h2>
          <Card className="mb-6">
            {pccCourses.length > 0 ? (
              <Table
                columns={pccColumns}
                dataSource={pccCourses}
                rowKey="courseCode"
                pagination={false}
              />
            ) : (
              <p className="text-gray-500">No core courses available for this semester.</p>
            )}
          </Card>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Elective Buckets ({buckets.length})</h2>
            <Button
              type="primary"
              onClick={handleAddBucket}
              disabled={loading || !selectedSemester || !selectedRegulationId || !selectedSemesterNumber}
            >
              ➕ Add Elective Bucket
            </Button>
          </div>
          
          {buckets.length > 0 ? (
            <Collapse items={collapseItems} className="mb-8" />
          ) : (
            <Card className="text-center py-12 bg-gradient-to-r from-blue-50 to-indigo-50">
              <p className="text-xl text-gray-500 mb-2">No elective buckets created yet</p>
              <p className="text-gray-400 mb-4">Create your first bucket to start organizing PEC/OEC courses</p>
              <Button
                type="primary"
                size="large"
                onClick={handleAddBucket}
                disabled={!selectedRegulationId || !selectedSemesterNumber}
              >
                🚀 Create First Elective Bucket
              </Button>
            </Card>
          )}

          <Button
            type="primary"
            size="large"
            onClick={handleSubmitRecommendation}
            disabled={loading || buckets.length === 0}
            className="mt-6 px-8"
          >
            📋 Submit Recommendation ({buckets.reduce((total, b) => total + (b.courses?.length || 0), 0)} courses)
          </Button>

          {showPreview && (
            <Card title="📄 Recommendation Preview" className="mt-8">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Core Courses (PCC)</h3>
              {pccCourses.length > 0 ? (
                <ul className="list-disc pl-5 mb-6 space-y-1">
                  {pccCourses.map(c => (
                    <li key={c.courseCode} className="text-gray-700">
                      {c.courseCode} - {c.courseTitle}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 mb-6 italic">No core courses</p>
              )}
              
              <h3 className="text-xl font-bold mb-4 text-gray-800">Elective Buckets</h3>
              {buckets.map(bucket => (
                <div key={bucket.bucketId} className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
                  <h4 className="font-semibold text-lg text-blue-600 mb-3">
                    {bucket.bucketName || `Elective ${bucket.bucketNumber}`} ({bucket.courses?.length || 0} courses)
                  </h4>
                  {bucket.courses?.length > 0 ? (
                    Object.entries(getGroupedCourses(bucket.courses)).map(([vertical, courses]) => (
                      <div key={vertical} className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">{vertical}</h5>
                        <ul className="list-disc pl-5 space-y-1">
                          {courses.map(c => (
                            <li key={c.courseCode} className="text-gray-600">
                              {c.courseCode} - {c.courseTitle}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No courses in this bucket</p>
                  )}
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {showAddBucketModal && (
        <AddBucketModal
          semesterId={selectedSemester}
          regulationId={selectedRegulationId}
          semesterNumber={selectedSemesterNumber}
          assignedCourses={assignedCourses}
          onBucketAdded={handleBucketAdded}
          setShowAddBucketModal={setShowAddBucketModal}
        />
      )}
    </div>
  );
};

export default CourseRecommendation;