import React, { useState, useEffect } from "react";
import {
  Filter,
  Save,
  Edit,
  X,
  Clock,
  Coffee,
  UtensilsCrossed,
  Sparkles,
  Loader
} from "lucide-react";
import axios from "axios";

const API_BASE_URL = "http://localhost:4000";
const ALLOCATE_URL = `${API_BASE_URL}/api/admin/timetable/allocate`;

const Timetable = () => {
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetableData, setTimetableData] = useState([]);
  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [allocationMode, setAllocationMode] = useState(""); // "select" | "manual" | "bucket"
  const [customCourseInput, setCustomCourseInput] = useState("");
  const [selectedBucketId, setSelectedBucketId] = useState("");
  const [error, setError] = useState(null);
  
  // New State for Auto Generation
  const [isGenerating, setIsGenerating] = useState(false);

  // Bucket states
  const [electiveBuckets, setElectiveBuckets] = useState([]);
  const [bucketCourses, setBucketCourses] = useState([]);

  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const periods = [
    { id: 1, name: "Period 1", time: "9:15-10:05", type: "class" },
    { id: 2, name: "Period 2", time: "10:05-10:55", type: "class" },
    { id: 3, name: "Short Break", time: "10:55-11:10", type: "break" },
    { id: 4, name: "Period 3", time: "11:10-12:00", type: "class" },
    { id: 5, name: "Period 4", time: "12:00-12:50", type: "class" },
    { id: 6, name: "Lunch Break", time: "12:50-1:50", type: "lunch" },
    { id: 7, name: "Period 5", time: "1:50-2:40", type: "class" },
    { id: 8, name: "Period 6", time: "2:40-3:30", type: "class" },
    { id: 9, name: "Short Break", time: "3:30-3:45", type: "break" },
    { id: 10, name: "Period 7", time: "3:45-4:30", type: "class" },
    { id: 11, name: "Period 8", time: "4:30-5:15", type: "class" },
  ];

  const getBackendPeriod = (frontendId) => {
    const mapping = { 1: 1, 2: 2, 4: 3, 5: 4, 7: 5, 8: 6, 10: 7, 11: 8 };
    return mapping[frontendId] || null;
  };

  const getFrontendId = (backendPeriod) => {
    const mapping = { 1: 1, 2: 2, 3: 4, 4: 5, 5: 7, 6: 8, 7: 10, 8: 11 };
    return mapping[backendPeriod] || null;
  };

  // Auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token)
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  // Fetch basic data
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/admin/timetable/batches`)
      .then((res) => {
        const unique = [...new Set(res.data.data.map((b) => b.degree))];
        setDegrees(unique);
        setBatches(res.data.data);
      })
      .catch(() => setError("Failed to load batches"));
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/admin/timetable/departments`).then((res) => {
      setDepartments(
        res.data.data.map((d) => ({
          departmentId: d.Deptid,
          departmentCode: d.deptCode,
          departmentName: d.Deptname,
        }))
      );
    });
  }, []);

  useEffect(() => {
    if (selectedDegree && selectedBatch && selectedDept) {
      const batch = batches.find((b) => b.batchId === +selectedBatch);
      if (!batch) return;
      axios
        .get(`${API_BASE_URL}/api/admin/semesters/by-batch-branch`, {
          params: {
            degree: selectedDegree,
            batch: batch.batch,
            branch: batch.branch,
          },
        })
        .then((res) => setSemesters(res.data.data || []));
    }
  }, [selectedDegree, selectedBatch, selectedDept, batches]);

  useEffect(() => {
    if (selectedSem) {
      axios
        .get(`${API_BASE_URL}/api/admin/semesters/${selectedSem}/courses`)
        .then((res) => setCourses(res.data.data || []));
    }
  }, [selectedSem]);

  useEffect(() => {
    if (selectedSem) {
      fetchTimetable();
    }
  }, [selectedSem]);

  const fetchTimetable = () => {
    axios
      .get(`${API_BASE_URL}/api/admin/timetable/semester/${selectedSem}`)
      .then((res) => setTimetableData(res.data.data || []))
      .catch((err) => console.error(err));
  };

  // Fetch Elective Buckets + Courses
  useEffect(() => {
    if (!selectedSem) {
      setElectiveBuckets([]);
      setBucketCourses([]);
      return;
    }

    const fetchBuckets = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/admin/elective-buckets/${selectedSem}`
        );
        const buckets = res.data.data || [];
        setElectiveBuckets(buckets);

        const allCourses = await Promise.all(
          buckets.map(async (b) => {
            try {
              const cRes = await axios.get(
                `${API_BASE_URL}/api/admin/bucket-courses/${b.bucketId}`
              );
              return (cRes.data.data || []).map((c) => ({
                ...c,
                bucketId: b.bucketId,
                bucketNumber: b.bucketNumber,
                bucketName: b.bucketName || `Bucket ${b.bucketNumber}`,
              }));
            } catch {
              return [];
            }
          })
        );
        setBucketCourses(allCourses.flat());
      } catch (err) {
        console.error("Failed to load buckets", err);
      }
    };
    fetchBuckets();
  }, [selectedSem]);

  const handleCellClick = (day, periodId, type) => {
    if (type !== "class" || !editMode || !selectedSem) return;

    setSelectedCell({ day, periodId });
    setAllocationMode(""); // reset mode
    setCustomCourseInput(""); // reset input
    setSelectedBucketId(""); // reset bucket
    setShowCourseModal(true); // open modal
  };

  // --- AUTOMATIC GENERATION ---
  const handleAutoGenerate = async () => {
    if (!selectedSem) return alert("Please select a semester first.");
    
    // Warning confirmation
    if (!window.confirm("⚠️ This will OVERWRITE the current timetable for this semester. Existing data will be deleted. Do you want to continue?")) {
      return;
    }

    setIsGenerating(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/timetable/generate/${selectedSem}`);
      
      // Refresh Data immediately after generation
      fetchTimetable();
      
      // Show Allocation Report
      const report = res.data.report || [];
      const successMsg = res.data.message || "Generated Successfully";

      if (report.length === 0 || (report.length === 1 && report[0] === "All constraints satisfied")) {
        alert(`✅ ${successMsg}\n\nAll constraints were satisfied perfectly!`);
      } else {
        alert(`⚠️ ${successMsg} with warnings:\n\n${report.join("\n")}`);
      }

    } catch (err) {
      console.error(err);
      alert("❌ Generation Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
      setEditMode(false); // Switch off edit mode to view results cleanly
    }
  };

  // --- MANUAL ALLOCATION ---
  const handleCourseAssign = async (value) => {
    if (!selectedCell || !value) return;

    const backendPeriod = getBackendPeriod(selectedCell.periodId);
    if (!backendPeriod) return alert("Invalid period");

    try {
      const payload = {
        dayOfWeek: selectedCell.day,
        periodNumber: backendPeriod,
        semesterId: +selectedSem,
        Deptid: +selectedDept,
      };

      if (allocationMode === "select") {
        payload.course = value; // single regular course
      } else if (allocationMode === "manual") {
        payload.course = null; // free slot (or manual text if backend supported it)
      }

      await axios.post(ALLOCATE_URL, payload);

      fetchTimetable();
      setShowCourseModal(false);
      alert("Assignment successful!");
    } catch (err) {
      console.error(err);
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  // Assign bucket
  const handleAssignBucket = async () => {
    if (!selectedBucketId) return alert("Please select a bucket");

    const backendPeriod = getBackendPeriod(selectedCell.periodId);
    if (!backendPeriod) return alert("Invalid period");

    try {
      const payload = {
        dayOfWeek: selectedCell.day,
        periodNumber: backendPeriod,
        semesterId: +selectedSem,
        Deptid: +selectedDept,
        bucketId: +selectedBucketId,
      };

      await axios.post(ALLOCATE_URL, payload);

      fetchTimetable();
      setShowCourseModal(false);
      alert("All courses from the bucket assigned successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
  };

  // Delete all entries in a cell (soft delete)
  const handleRemoveCourses = async (day, periodId) => {
    const frontendPeriod = periodId;
    const backendPeriod = getBackendPeriod(frontendPeriod);

    if (!backendPeriod) return alert("Invalid period");

    const entriesToDelete = timetableData.filter(
      (e) => e.dayOfWeek === day && e.periodNumber === backendPeriod
    );

    if (entriesToDelete.length === 0) return;

    try {
      await Promise.all(
        entriesToDelete.map((entry) =>
          axios.delete(
            `${API_BASE_URL}/api/admin/timetable/entry/${entry.timetableId}`
          )
        )
      );

      fetchTimetable();
      alert("Courses removed successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert(
        "Failed to remove courses: " +
          (err.response?.data?.message || err.message)
      );
    }
  };

  // Render period header and cell
  const renderPeriodHeader = (period) => {
    const icons = {
      break: <Coffee className="w-4 h-4" />,
      lunch: <UtensilsCrossed className="w-4 h-4" />,
      class: <Clock className="w-4 h-4" />,
    };

    return (
      <div className="p-2 text-center font-medium border-r bg-gray-50 text-gray-500 min-h-[96px] flex flex-col justify-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          {icons[period.type]}
          <span className="text-xs">{period.name}</span>
        </div>
        <div className="text-xs">{period.time}</div>
      </div>
    );
  };

  const renderCell = (day, period) => {
    if (period.type !== "class") {
      return (
        <div className="p-2 h-24 bg-gray-100 text-center text-gray-500 border-r flex items-center justify-center">
          {period.type === "break" ? "Coffee" : "Food"}
        </div>
      );
    }

    // Find ALL entries for this day + period
    const entries = timetableData.filter(
      (e) => e.dayOfWeek === day && getFrontendId(e.periodNumber) === period.id
    );

    const selected =
      selectedCell?.day === day && selectedCell?.periodId === period.id;

    return (
      <div
        className={`relative p-2 h-24 border-r transition-all ${
          editMode ? "cursor-pointer hover:bg-indigo-50" : ""
        } ${selected ? "bg-indigo-100 ring-2 ring-indigo-500" : ""} ${
          entries.length > 0 ? "bg-white" : "bg-gray-50"
        }`}
        onClick={() => handleCellClick(day, period.id, period.type)}
      >
        {entries.length > 0 ? (
          <div className="h-full flex flex-col justify-between">
            {entries.length === 1 ? (
              // Single course (regular or manual)
              <>
                <div className="font-semibold text-xs text-gray-900 truncate p-1">
                  {entries[0].courseTitle || entries[0].courseId}
                </div>
                <div className="text-xs text-gray-600 truncate px-1 pb-1">
                  {entries[0].courseCode || "Regular Course"}
                </div>
              </>
            ) : (
              // Multiple courses → likely from a bucket
              <div className="text-center h-full flex flex-col justify-center">
                <div className="font-bold text-sm text-purple-700">
                  Elective Bucket
                </div>
                <div className="text-xs text-purple-600">
                  {entries.length} courses
                </div>
              </div>
            )}

            {editMode && entries.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCourses(day, period.id);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 z-10"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : editMode ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs">
            Click to assign
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      {/* Header & Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-black text-gray-900">
            Timetable Management
          </h1>
          
          {selectedSem && (
            <div className="flex gap-3">
              {/* Auto Generate Button */}
              <button
                onClick={handleAutoGenerate}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-bold shadow-md transition-all ${
                  isGenerating
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transform hover:scale-105"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Auto Generate
                  </>
                )}
              </button>

              {/* Edit/Save Button */}
              <button
                onClick={() => setEditMode(!editMode)}
                disabled={isGenerating}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-lg font-bold shadow-md transition-all ${
                  editMode
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-800 hover:bg-gray-900 text-white"
                }`}
              >
                {editMode ? (
                  <>
                    <Save className="w-5 h-5" /> Done
                  </>
                ) : (
                  <>
                    <Edit className="w-5 h-5" /> Manual Edit
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Degree
            </label>
            <select
              value={selectedDegree}
              onChange={(e) => {
                setSelectedDegree(e.target.value);
                setSelectedBatch("");
                setSelectedDept("");
                setSelectedSem("");
                setEditMode(false);
              }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select Degree</option>
              {degrees.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setSelectedDept("");
                setSelectedSem("");
              }}
              disabled={!selectedDegree}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select Batch</option>
              {batches
                .filter((b) => b.degree === selectedDegree)
                .map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.branch} ({b.batchYears})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedSem("");
              }}
              disabled={!selectedBatch}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select Department</option>
              {departments
                .filter((dept) =>
                  batches.some(
                    (b) =>
                      b.degree === selectedDegree &&
                      b.batchId === +selectedBatch &&
                      b.branch.toUpperCase() ===
                        dept.departmentCode.toUpperCase()
                  )
                )
                .map((dept) => (
                  <option key={dept.departmentId} value={dept.departmentId}>
                    {dept.departmentName} ({dept.departmentCode})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester
            </label>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              disabled={!selectedDept}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select Semester</option>
              {semesters.map((sem) => (
                <option key={sem.semesterId} value={sem.semesterId}>
                  Semester {sem.semesterNumber}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {selectedSem ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {departments.find((d) => d.departmentId === +selectedDept)
                ?.departmentName || "Dept"}{" "}
              - Semester{" "}
              {
                semesters.find((s) => s.semesterId === +selectedSem)
                  ?.semesterNumber
              }
            </h2>
            <div className="text-sm text-gray-500">
              {timetableData.length} allocated slots
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[140px_repeat(11,minmax(140px,1fr))] min-w-[1600px]">
              <div className="sticky top-0 left-0 bg-gray-100 z-30 p-4 font-bold border-r border-b">
                Day/Period
              </div>
              {periods.map((p) => (
                <div
                  key={p.id}
                  className="sticky top-0 bg-gray-50 z-20 border-b border-r"
                >
                  {renderPeriodHeader(p)}
                </div>
              ))}
              {days.map((day) => (
                <React.Fragment key={day}>
                  <div className="sticky left-0 bg-gray-100 z-20 p-4 font-bold border-r border-b">
                    {day}
                  </div>
                  {periods.map((p) => (
                    <div key={`${day}-${p.id}`} className="border-b border-r">
                      {renderCell(day, p)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl shadow">
          <Filter className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold">
            Select filters to load timetable
          </h3>
        </div>
      )}

      {/* Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-indigo-900">
                Assign Course
              </h2>
              <button onClick={() => setShowCourseModal(false)}>
                <X className="w-7 h-7 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <p className="text-lg text-gray-700 mb-8">
              Assigning:{" "}
              <strong>
                {selectedCell?.day} •{" "}
                {periods.find((p) => p.id === selectedCell?.periodId)?.name}
              </strong>
            </p>

            <div className="space-y-6">
              <select
                value={allocationMode}
                onChange={(e) => {
                  setAllocationMode(e.target.value);
                  setCustomCourseInput("");
                  setSelectedBucketId("");
                }}
                className="w-full p-4 text-base border-2 border-gray-300 rounded-lg"
              >
                <option value="">Choose assignment method...</option>
                <option value="select">Regular Course</option>
                <option value="manual">Manual / Activity</option>
                <option value="bucket">
                  Elective Bucket (All Courses in Bucket)
                </option>
              </select>

              {allocationMode === "select" && (
                <select
                  value={customCourseInput}
                  onChange={(e) => setCustomCourseInput(e.target.value)}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg"
                >
                  <option value="">Select a course...</option>
                  {courses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseCode} - {c.courseTitle}
                    </option>
                  ))}
                </select>
              )}

              {allocationMode === "manual" && (
                <input
                  type="text"
                  placeholder="e.g., Project Review, Guest Lecture"
                  value={customCourseInput}
                  onChange={(e) => setCustomCourseInput(e.target.value)}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg"
                />
              )}

              {allocationMode === "bucket" && (
                <select
                  value={selectedBucketId}
                  onChange={(e) => setSelectedBucketId(e.target.value)}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg"
                >
                  <option value="">Select a bucket...</option>
                  {electiveBuckets.map((b) => {
                    const count = bucketCourses.filter(
                      (c) => c.bucketId === b.bucketId
                    ).length;
                    return (
                      <option key={b.bucketId} value={b.bucketId}>
                        {b.bucketName || `Bucket ${b.bucketNumber}`} ({count}{" "}
                        courses)
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div className="mt-8 space-y-3">
              {(allocationMode === "select" || allocationMode === "manual") &&
                customCourseInput && (
                  <button
                    onClick={() => handleCourseAssign(customCourseInput)}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-lg"
                  >
                    Confirm Assignment
                  </button>
                )}

              {allocationMode === "bucket" && selectedBucketId && (
                <button
                  onClick={handleAssignBucket}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-lg"
                >
                  Assign All Courses in Selected Bucket
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Courses Panel */}
      {selectedSem && (
        <div className="mt-10 bg-white rounded-xl shadow p-6">
          <h3 className="text-2xl font-bold mb-6">Courses & Buckets</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xl font-bold mb-4">Regular Courses</h4>
              {courses.map((c) => (
                <div key={c.courseId} className="p-4 border rounded-lg mb-3">
                  <strong>{c.courseCode}</strong> - {c.courseTitle}
                  <div className="text-sm text-gray-500 mt-1">
                    Type: {c.type} | Credits: {c.credits}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-xl font-bold mb-4">Elective Buckets</h4>
              {electiveBuckets.map((b) => (
                <div
                  key={b.bucketId}
                  className="p-4 border rounded-lg mb-3 bg-purple-50"
                >
                  <strong>{b.bucketName || `Bucket ${b.bucketNumber}`}</strong>
                  <p className="text-sm text-gray-600">
                    {
                      bucketCourses.filter((c) => c.bucketId === b.bucketId)
                        .length
                    }{" "}
                    courses
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;