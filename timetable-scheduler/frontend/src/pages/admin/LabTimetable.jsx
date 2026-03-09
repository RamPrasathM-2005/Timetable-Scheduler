import React, { useState, useEffect } from "react";
import {
  Monitor,
  X,
  Clock,
  Beaker,
  Trash2,
  Users,
  CheckCircle,
  AlertTriangle,
  Loader,
  Ban
} from "lucide-react";
import axios from "axios";

// --- API INSTANCE (Same as before) ---
const api = axios.create({
  baseURL: "http://localhost:4000/api/admin",
  headers: { "Content-Type": "application/json" },
});
api.interceptors.request.use(config => {
    const token = localStorage.getItem("token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    return config;
});

const LabTimetable = () => {
  // ... (Keep existing State: departments, semesters, selectedDept, selectedLab etc.) ...
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedLab, setSelectedLab] = useState(""); 
  const [labs, setLabs] = useState([]); 
  const [courses, setCourses] = useState([]); 
  const [timetableData, setTimetableData] = useState([]); 
  
  // --- NEW STATE FOR LAB STATUS ---
  const [labStatuses, setLabStatuses] = useState([]); // Stores Free/Occupied info

  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [allocSemester, setAllocSemester] = useState("");
  const [allocCourse, setAllocCourse] = useState("");
  const [courseSections, setCourseSections] = useState([]); 
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [batchAllocations, setBatchAllocations] = useState({}); 

  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const periods = [
    { id: 1, name: "P1", time: "09:15-10:05", type: "class" },
    { id: 2, name: "P2", time: "10:05-10:55", type: "class" },
    { id: 3, name: "BRK", time: "10:55-11:10", type: "break" },
    { id: 4, name: "P3", time: "11:10-12:00", type: "class" },
    { id: 5, name: "P4", time: "12:00-12:50", type: "class" },
    { id: 6, name: "LUN", time: "12:50-01:50", type: "lunch" },
    { id: 7, name: "P5", time: "01:50-02:40", type: "class" },
    { id: 8, name: "P6", time: "02:40-03:30", type: "class" },
    { id: 9, name: "BRK", time: "03:30-03:45", type: "break" },
    { id: 10, name: "P7", time: "03:45-04:30", type: "class" },
    { id: 11, name: "P8", time: "04:30-05:15", type: "class" },
  ];

  // Helper mappings
  const getBackendPeriod = (frontendId) => {
    const mapping = { 1: 1, 2: 2, 4: 3, 5: 4, 7: 5, 8: 6, 10: 7, 11: 8 };
    return mapping[frontendId] || null;
  };
  const getFrontendId = (backendPeriod) => {
    const mapping = { 1: 1, 2: 2, 3: 4, 4: 5, 5: 7, 6: 8, 7: 10, 8: 11 };
    return mapping[backendPeriod] || null;
  };

  // ... (Keep Initial Load, Dept Change, Lab Change effects) ...
  useEffect(() => {
    const loadInitialData = async () => {
        try {
            const deptsRes = await api.get("/timetable/departments");
            setDepartments(deptsRes.data.data);
            const batchRes = await api.get("/timetable/batches"); // used for semesters later
        } catch (err) { console.error(err); }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedDept) return;
    api.get(`/labs/${selectedDept}`).then(res => setLabs(res.data));
    setSelectedLab(""); setTimetableData([]);
  }, [selectedDept]);

  useEffect(() => {
    if (!selectedLab) return;
    api.get(`/timetable/lab/${selectedLab}`).then(res => setTimetableData(res.data.data || []));
  }, [selectedLab]);

  // --- MODAL LOGIC UPDATED ---
  
  const handleCellClick = async (day, periodId, type) => {
    if (!selectedLab) return alert("Please select a Lab to view first.");
    if (type !== "class") return;

    const backendPeriod = getBackendPeriod(periodId);
    if (!backendPeriod) return;
    
    setSelectedCell({ day, period: backendPeriod });
    setShowModal(true);
    setAllocSemester("");
    setAllocCourse("");
    setBatchAllocations({});
    setLoadingLabs(true);
    
    // Fetch Semesters 
    api.get("/semesters/search").then(res => setSemesters(res.data.data || []));

    // --- FETCH LAB STATUS (New Logic) ---
    try {
      const res = await api.get("/labs/status", {
        params: { day, period: backendPeriod, deptId: selectedDept }
      });
      setLabStatuses(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Error checking lab status");
    } finally {
        setLoadingLabs(false);
    }
  };

  // ... (Keep handleBatchAllocationChange, submitAllocation, handleDelete) ...
  // Keep the fetch logic for courses/sections inside useEffects tied to allocSemester/allocCourse

    useEffect(() => {
    if (!allocSemester) return;
    api.get(`/semesters/${allocSemester}/courses`).then(res => {
      const practicals = (res.data.data || []).filter(c => 
        ['PRACTICAL', 'INTEGRATED', 'EXPERIENTIAL LEARNING'].includes(c.type)
      );
      setCourses(practicals);
    });
  }, [allocSemester]);

  useEffect(() => {
    if (!allocCourse) return;
    setCourseSections([]);
    setBatchAllocations({});
    api.get(`/courses/${allocCourse}/sections`).then(res => setCourseSections(res.data.data || []));
  }, [allocCourse]);

  const handleBatchAllocationChange = (sectionId, labId) => {
    setBatchAllocations(prev => ({ ...prev, [sectionId]: labId }));
  };

  const submitAllocation = async () => {
    let allocations = [];
    if (courseSections.length > 0) {
      allocations = Object.entries(batchAllocations).map(([secId, labId]) => ({
        sectionId: secId, labId: labId
      }));
      if (allocations.length !== courseSections.length) return alert(`Assign all batches.`);
    } else {
      allocations.push({ sectionId: null, labId: selectedLab });
    }

    try {
      await api.post("/timetable/allocate-multi", {
        allocations, semesterId: allocSemester, deptId: selectedDept, courseId: allocCourse,
        day: selectedCell.day, period: selectedCell.period
      });
      alert("✅ Allocated!"); setShowModal(false);
      api.get(`/timetable/lab/${selectedLab}`).then(res => setTimetableData(res.data.data || []));
    } catch (err) { alert("❌ Error: " + (err.response?.data?.message || err.message)); }
  };
  
  const handleDelete = async (id) => {
    if(!window.confirm("Delete?")) return;
    await api.delete(`/timetable/entry/${id}`);
    api.get(`/timetable/lab/${selectedLab}`).then(res => setTimetableData(res.data.data || []));
  };


  const getCellData = (day, periodId) => {
    const backendPeriod = getBackendPeriod(periodId);
    if (!backendPeriod) return null;
    return timetableData.find(t => t.dayOfWeek === day && t.periodNumber === backendPeriod);
  };

  // --- RENDER ---
  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 font-sans">
      
      {/* HEADER & FILTERS (Same as before) */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <Beaker className="w-8 h-8 text-blue-600" />
          <div>
             <h1 className="text-2xl font-black text-gray-900">Lab Management</h1>
             <p className="text-sm text-gray-500">Resource-Centric Timetable View</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-1/3">
             <label className="text-xs font-bold text-gray-500 uppercase">Department</label>
             <select className="w-full mt-1 p-3 border rounded" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
               <option value="">-- Select --</option>
               {departments.map(d => <option key={d.Deptid} value={d.Deptid}>{d.Deptname}</option>)}
             </select>
          </div>
          <div className="w-1/3">
             <label className="text-xs font-bold text-gray-500 uppercase">Select Lab Room</label>
             <select className="w-full mt-1 p-3 border rounded" value={selectedLab} onChange={e => setSelectedLab(e.target.value)} disabled={!selectedDept}>
               <option value="">-- Select Lab --</option>
               {labs.map(l => <option key={l.labId} value={l.labId}>{l.labName}</option>)}
             </select>
          </div>
        </div>
      </div>

      {/* GRID (Same as before, using getCellData) */}
      {selectedLab ? (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="bg-blue-600 text-white p-3 font-bold flex justify-between">
            <span>SCHEDULE: {labs.find(l => l.labId == selectedLab)?.labName}</span>
          </div>
          <div className="overflow-x-auto">
             <div className="grid grid-cols-[80px_repeat(11,minmax(110px,1fr))] min-w-[1300px]">
                <div className="bg-gray-200 p-4 font-black border-b border-r text-center">DAY</div>
                {periods.map(p => (
                   <div key={p.id} className="bg-gray-100 p-2 text-center border-b border-r text-[11px] font-bold">
                     {p.name}<br/><span className="text-[10px] text-gray-500">{p.time}</span>
                   </div>
                ))}
                {days.map(day => (
                   <React.Fragment key={day}>
                      <div className="bg-gray-50 p-4 font-black border-r border-b flex items-center justify-center text-sm">{day}</div>
                      {periods.map(p => {
                          if(p.type !== 'class') return <div key={p.id} className="bg-gray-100 border-b border-r"></div>;
                          const entry = getCellData(day, p.id);
                          return (
                            <div key={p.id} onClick={() => !entry && handleCellClick(day, p.id, p.type)}
                                 className={`min-h-[100px] p-2 border-b border-r relative ${entry ? "bg-blue-50" : "hover:bg-blue-50 cursor-pointer"}`}>
                                {entry ? (
                                   <div>
                                     <div className="font-bold text-xs text-blue-800">{entry.courseCode}</div>
                                     <div className="text-[10px] text-gray-600">{entry.courseTitle}</div>
                                     <div className="mt-1 inline-block px-1 bg-white border rounded text-[10px] font-bold text-blue-600">{entry.sectionName || "All"}</div>
                                     <button onClick={(e)=>{e.stopPropagation(); handleDelete(entry.timetableId)}} className="absolute bottom-1 right-1 text-red-400"><Trash2 className="w-3 h-3"/></button>
                                   </div>
                                ) : <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 text-xs text-green-600 font-bold">+ Add</div>}
                            </div>
                          )
                      })}
                   </React.Fragment>
                ))}
             </div>
          </div>
        </div>
      ) : <div className="text-center py-20 text-gray-400 font-bold">Select a Lab</div>}

      {/* --- ALLOCATION MODAL (UPDATED) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
               <h2 className="font-bold">Allocate Lab ({selectedCell?.day} - P{selectedCell?.period})</h2>
               <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT SIDE: CONTROLS */}
                <div className="w-1/3 p-6 border-r overflow-y-auto bg-gray-50">
                   <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500">Semester</label>
                        <select className="w-full p-2 border rounded bg-white" onChange={e => setAllocSemester(e.target.value)} value={allocSemester}>
                          <option value="">Select Sem</option>
                          {semesters.map(s => <option key={s.semesterId} value={s.semesterId}>{s.semesterNumber}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">Course</label>
                        <select className="w-full p-2 border rounded bg-white" onChange={e => setAllocCourse(e.target.value)} value={allocCourse} disabled={!allocSemester}>
                          <option value="">Select Course</option>
                          {courses.map(c => <option key={c.courseId} value={c.courseId}>{c.courseCode}</option>)}
                        </select>
                      </div>
                      {/* BATCH MAPPING CONTROLS */}
                      {allocCourse && courseSections.length > 0 && (
                        <div className="space-y-2 mt-4">
                            <h4 className="font-bold text-sm text-blue-800">Assign Batches</h4>
                            {courseSections.map(sec => (
                                <div key={sec.sectionId} className="bg-white p-2 rounded border shadow-sm">
                                    <div className="text-xs font-bold mb-1">Batch {sec.sectionName}</div>
                                    <select 
                                        className="w-full text-xs p-1 border rounded"
                                        value={batchAllocations[sec.sectionId] || ""}
                                        onChange={(e) => handleBatchAllocationChange(sec.sectionId, e.target.value)}
                                    >
                                        <option value="">Select Lab</option>
                                        {/* Filter out fully occupied labs unless they are occupied by US in this session */}
                                        {labStatuses.filter(l => !l.courseCode).map(l => (
                                            <option key={l.labId} value={l.labId}>{l.labName}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                      )}
                      {allocCourse && courseSections.length === 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                              Assigning to currently viewed lab: <b>{labs.find(l=>l.labId == selectedLab)?.labName}</b>
                          </div>
                      )}
                   </div>
                </div>

                {/* RIGHT SIDE: LAB STATUS GRID (THE NEW PART) */}
                <div className="w-2/3 p-6 overflow-y-auto bg-white">
                   <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                       <Monitor className="w-4 h-4"/> Current Lab Status 
                       {loadingLabs && <Loader className="w-4 h-4 animate-spin text-blue-600"/>}
                   </h3>
                   
                   <div className="grid grid-cols-2 gap-3">
                       {labStatuses.map((status) => {
                           const isOccupied = !!status.courseCode;
                           const isCurrentView = status.labId == selectedLab;
                           
                           return (
                               <div key={status.labId} 
                                    className={`p-3 rounded-lg border flex flex-col justify-between min-h-[80px]
                                    ${isOccupied 
                                        ? "bg-red-50 border-red-100 text-red-900" 
                                        : "bg-green-50 border-green-100 text-green-900"
                                    } ${isCurrentView ? "ring-2 ring-blue-500" : ""}`}
                               >
                                   <div className="flex justify-between items-start">
                                       <span className="font-bold text-sm">{status.labName}</span>
                                       {isOccupied ? <Ban className="w-4 h-4 opacity-50"/> : <CheckCircle className="w-4 h-4 opacity-50"/>}
                                   </div>
                                   
                                   {isOccupied ? (
                                       <div className="mt-2 text-xs">
                                           <div className="font-bold">{status.courseCode}</div>
                                           <div className="opacity-75">{status.sectionName ? `Batch ${status.sectionName}` : 'All Batches'}</div>
                                       </div>
                                   ) : (
                                       <div className="mt-2 text-xs font-medium opacity-75">
                                           Available (Cap: {status.capacity})
                                       </div>
                                   )}
                               </div>
                           )
                       })}
                   </div>
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
               <button onClick={submitAllocation} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Confirm Allocation</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LabTimetable;