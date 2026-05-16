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
  Loader,
  Beaker // Icon for Lab
} from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MySwal, showErrorToast, showInfoToast, showSuccessToast } from "../../utils/swalConfig";

const API_BASE_URL = "http://localhost:4000";
const ALLOCATE_URL = `${API_BASE_URL}/api/admin/timetable/allocate`;

const Timetable = () => {
  // --- STATE MANAGEMENT ---
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetableData, setTimetableData] = useState([]);

  // Selections
  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");

  // UI Modes
  const [editMode, setEditMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [ignoreGlobalLabBusy, setIgnoreGlobalLabBusy] = useState(false);

  // Manual Allocation State
  const [allocationMode, setAllocationMode] = useState(""); 
  const [customCourseInput, setCustomCourseInput] = useState("");
  const [selectedBucketId, setSelectedBucketId] = useState("");
  const [electiveBuckets, setElectiveBuckets] = useState([]);
  const [bucketCourses, setBucketCourses] = useState([]);
  const [error, setError] = useState(null);
  const [labRooms, setLabRooms] = useState([]);
  const [labCourseId, setLabCourseId] = useState("");
  const [labSectionId, setLabSectionId] = useState("");
  const [labId, setLabId] = useState("");
  const [labSections, setLabSections] = useState([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [allocateAllSections, setAllocateAllSections] = useState(true);
  const [labAllocations, setLabAllocations] = useState({});

  // --- CONFIGURATION ---
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const periods = [
    { id: 1, name: "Period 1", time: "9:15-10:05", type: "class" },
    { id: 2, name: "Period 2", time: "10:05-10:55", type: "class" },
    { id: 3, name: "Break", time: "10:55-11:10", type: "break" }, // Shortened name
    { id: 4, name: "Period 3", time: "11:10-12:00", type: "class" },
    { id: 5, name: "Period 4", time: "12:00-12:50", type: "class" },
    { id: 6, name: "Lunch", time: "12:50-1:50", type: "lunch" }, // Shortened name
    { id: 7, name: "Period 5", time: "1:50-2:40", type: "class" },
    { id: 8, name: "Period 6", time: "2:40-3:30", type: "class" },
    { id: 9, name: "Break", time: "3:30-3:45", type: "break" }, // Shortened name
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

  // --- API INTERCEPTOR ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token)
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  // --- DATA FETCHING ---
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

      fetchTimetable();
      fetchBucketsAndCourses();
    }
  }, [selectedSem]);

  useEffect(() => {
    if (allocationMode !== "lab") return;
    if (!selectedDept) {
      setLabRooms([]);
      setLabId("");
      return;
    }

    const fetchLabs = async () => {
      setLoadingLabs(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/labs/${selectedDept}`);
        setLabRooms(res.data || []);
      } catch (err) {
        console.error("Failed to load labs", err);
        setLabRooms([]);
      } finally {
        setLoadingLabs(false);
      }
    };

    fetchLabs();
  }, [allocationMode, selectedDept]);

  useEffect(() => {
    if (allocationMode !== "lab") return;
    if (!labCourseId) {
      setLabSections([]);
      setLabSectionId("");
      setLabAllocations({});
      return;
    }

    const fetchSections = async () => {
      setLoadingSections(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/courses/${labCourseId}/sections`);
        setLabSections(res.data.data || []);
        setLabAllocations({});
      } catch (err) {
        console.error("Failed to load sections", err);
        setLabSections([]);
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSections();
  }, [allocationMode, labCourseId]);

  const fetchTimetable = () => {
    axios
      .get(`${API_BASE_URL}/api/admin/timetable/semester/${selectedSem}`)
      .then((res) => setTimetableData(res.data.data || []))
      .catch((err) => console.error(err));
  };

  const fetchBucketsAndCourses = async () => {
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

  // --- HANDLERS ---
  const handleCellClick = (day, periodId, type) => {
    if (type !== "class" || !editMode || !selectedSem) return;
    setSelectedCell({ day, periodId });
    setAllocationMode(""); 
    setCustomCourseInput(""); 
    setSelectedBucketId(""); 
    setShowCourseModal(true); 
  };

  const handleAutoGenerate = async () => {
    if (!selectedSem) {
      showErrorToast("Missing semester", "Please select a semester first.");
      return;
    }

    const confirmResult = await MySwal.fire({
      icon: "warning",
      title: "Auto-Generate Timetable?",
      text: ignoreGlobalLabBusy
        ? "Existing manual allocations will be preserved. Auto‑gen will only fill empty slots. Note: other semesters' lab usage will be ignored."
        : "Existing manual allocations will be preserved. Auto‑gen will only fill empty slots.",
      showCancelButton: true,
      confirmButtonText: "Generate",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#64748b",
    });
    if (!confirmResult.isConfirmed) return;

    setIsGenerating(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/timetable/generate/${selectedSem}`,
        null,
        {
          params: ignoreGlobalLabBusy ? { ignoreGlobalLabBusy: true } : {},
        }
      );
      fetchTimetable();
      
      const report = res.data.report || [];
      const successMsg = res.data.message || "Generated Successfully";
      const labReject = res.data.metrics?.labBlockRejections || null;
      const labRejectTotal = labReject
        ? (labReject.slotOccupied || 0) +
          (labReject.staffBusy || 0) +
          (labReject.staffConsecutive || 0) +
          (labReject.noLabs || 0)
        : 0;

      if (report.length === 0 || (report.length === 1 && report[0] === "All constraints satisfied")) {
        showSuccessToast(`${successMsg}. All constraints were satisfied.`);
        if (labReject && labRejectTotal > 0) {
          await MySwal.fire({
            icon: "info",
            title: "Lab Allocation Debug",
            html: `<div style="text-align:left;margin:0;">
                    <div style="margin-bottom:6px;">Lab block rejections:</div>
                    <ul style="padding-left:18px;margin:0;">
                      <li>Slot occupied: ${labReject.slotOccupied || 0}</li>
                      <li>Staff busy: ${labReject.staffBusy || 0}</li>
                      <li>Staff consecutive: ${labReject.staffConsecutive || 0}</li>
                      <li>No labs available: ${labReject.noLabs || 0}</li>
                    </ul>
                    <div style="margin-top:10px;font-size:12px;color:#6b7280;">
                      <div><b>Slot occupied</b>: the semester already has something in that period.</div>
                      <div><b>Staff busy</b>: the staff is already teaching at that same time (any semester).</div>
                      <div><b>Staff consecutive</b>: the staff would be scheduled in adjacent periods.</div>
                      <div><b>No labs available</b>: all lab rooms were occupied in that time block.</div>
                    </div>
                  </div>`,
            confirmButtonText: "OK",
          });
        }
      } else {
        await MySwal.fire({
          icon: "warning",
          title: successMsg,
          html: `<div style="text-align:left;margin:0;">
                  <div style="margin-bottom:6px;">Generated with warnings:</div>
                  <ul style="padding-left:18px;margin:0;">
                    ${report.map((r) => `<li>${r}</li>`).join("")}
                  </ul>
                  ${
                    labReject
                      ? `<div style="margin-top:10px;margin-bottom:6px;">Lab block rejections:</div>
                         <ul style="padding-left:18px;margin:0;">
                           <li>Slot occupied: ${labReject.slotOccupied || 0}</li>
                           <li>Staff busy: ${labReject.staffBusy || 0}</li>
                           <li>Staff consecutive: ${labReject.staffConsecutive || 0}</li>
                           <li>No labs available: ${labReject.noLabs || 0}</li>
                         </ul>`
                      : ""
                  }
                  <div style="margin-top:10px;font-size:12px;color:#6b7280;">
                    <div><b>Slot occupied</b>: the semester already has something in that period.</div>
                    <div><b>Staff busy</b>: the staff is already teaching at that same time (any semester).</div>
                    <div><b>Staff consecutive</b>: the staff would be scheduled in adjacent periods.</div>
                    <div><b>No labs available</b>: all lab rooms were occupied in that time block.</div>
                  </div>
                </div>`,
          confirmButtonText: "OK",
        });
      }

    } catch (err) {
      console.error(err);
      showErrorToast("Generation Failed", err.response?.data?.message || err.message);
    } finally {
      setIsGenerating(false);
      setEditMode(false);
    }
  };

  const handleCourseAssign = async (value) => {
    if (!selectedCell || !value) return;
    const backendPeriod = getBackendPeriod(selectedCell.periodId);

    try {
      const payload = {
        dayOfWeek: selectedCell.day,
        periodNumber: backendPeriod,
        semesterId: +selectedSem,
        Deptid: +selectedDept,
      };

      if (allocationMode === "select") {
        payload.course = value; 
      } else if (allocationMode === "manual") {
        payload.course = null; 
      }

      await axios.post(ALLOCATE_URL, payload);
      fetchTimetable();
      setShowCourseModal(false);
      showSuccessToast("Assignment successful!");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        showInfoToast("Slot already allocated", err.response?.data?.message || "This slot is already filled.");
      } else {
        showErrorToast("Assignment failed", err.response?.data?.message || err.message);
      }
    }
  };

  const handleAssignBucket = async () => {
    if (!selectedBucketId) {
      showErrorToast("Missing bucket", "Please select a bucket");
      return;
    }
    const backendPeriod = getBackendPeriod(selectedCell.periodId);

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
      showSuccessToast("All courses from the bucket assigned successfully!");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        showInfoToast("Slot already allocated", err.response?.data?.message || "This slot is already filled.");
      } else {
        showErrorToast("Assignment failed", err.response?.data?.message || err.message);
      }
    }
  };

  const handleDownloadPdf = () => {
    try {
      if (!timetableData || timetableData.length === 0) {
        showInfoToast("No data", "No timetable data to export.");
        return;
      }

      const doc = new jsPDF("landscape", "pt", "A3");
      const title = "Timetable";
      const selectedDeptName =
        departments.find((d) => String(d.departmentId) === String(selectedDept))?.departmentName || "";
      const selectedBatchName =
        batches.find((b) => String(b.batchId) === String(selectedBatch))?.batch || "";
      const selectedSemNumber =
        semesters.find((s) => String(s.semesterId) === String(selectedSem))?.semesterNumber || "";

    doc.setFontSize(16);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.text(
      `Degree: ${selectedDegree || "-"}   Batch: ${selectedBatchName || "-"}   Dept: ${selectedDeptName || "-"}   Semester: ${selectedSemNumber || "-"}`,
      40,
      58
    );

    const daysOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const periodCols = [1, 2, 3, 4, 5, 6, 7, 8];

    const slotKey = (day, period) => `${day}-${period}`;
    const grouped = new Map();
    timetableData.forEach((e) => {
      if (!e.dayOfWeek || !e.periodNumber) return;
      const key = slotKey(e.dayOfWeek, e.periodNumber);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(e);
    });

    const body = daysOrder.map((day) => {
      const row = [day];
      periodCols.forEach((period) => {
        const entries = grouped.get(slotKey(day, period)) || [];
        if (!entries.length) {
          row.push("");
          return;
        }
        const courseStaffMap = new Map();
        entries.forEach((entry) => {
          const course = entry.courseTitle || entry.courseCode || "";
          if (!courseStaffMap.has(course)) courseStaffMap.set(course, new Set());
          const staffRaw = entry.staffNames || "";
          if (staffRaw && staffRaw !== "Unassigned") {
            staffRaw.split(" / ").forEach((name) => {
              const trimmed = name.trim();
              if (trimmed) courseStaffMap.get(course).add(trimmed);
            });
          } else {
            courseStaffMap.get(course).add("Unassigned");
          }
        });

        const lines = Array.from(courseStaffMap.entries()).map(([course, staffSet]) => {
          const staffList = Array.from(staffSet).filter(Boolean);
          return staffList.length > 0 ? `${course}\n/ ${staffList.join(" / ")}` : course;
        });
        row.push(lines.join("\n\n"));
      });
      return row;
    });

    const formatStaffList = (names) => {
      const unique = Array.from(new Set(names.filter(Boolean)));
      return unique.join(", ");
    };

    const renderTable = (periodSubset, startY) => {
      const subBody = daysOrder.map((day) => {
        const row = [day];
        periodSubset.forEach((period) => {
          const entries = grouped.get(slotKey(day, period)) || [];
          if (!entries.length) {
            row.push("");
            return;
          }
          const courseStaffMap = new Map();
          entries.forEach((entry) => {
            const course = entry.courseTitle || entry.courseCode || "";
            if (!courseStaffMap.has(course)) courseStaffMap.set(course, new Set());
            const staffRaw = entry.staffNames || "";
            if (staffRaw && staffRaw !== "Unassigned") {
              staffRaw.split(" / ").forEach((name) => {
                const trimmed = name.trim();
                if (trimmed) courseStaffMap.get(course).add(trimmed);
              });
            } else {
              courseStaffMap.get(course).add("Unassigned");
            }
          });

          const lines = Array.from(courseStaffMap.entries()).map(([course, staffSet]) => {
            const staffList = Array.from(staffSet).filter((n) => n && n !== "Unassigned");
            const staffText = staffList.length ? formatStaffList(staffList) : "Unassigned";
            return `${course}\n${staffText}`;
          });
          row.push(lines.join("\n\n"));
        });
        return row;
      });

      autoTable(doc, {
        startY,
        head: [["Day", ...periodSubset.map((p) => `P${p}`)]],
        body: subBody,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          valign: "top",
          overflow: "linebreak",
        },
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229], textColor: 255, halign: "center", fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold", textColor: 80, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            data.cell.styles.minCellHeight = 90;
            if (data.column.index > 0) {
              data.cell.styles.cellWidth = 120;
              data.cell.styles.halign = "left";
              data.cell.text = [];
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index === 0) return;
          const raw = data.cell.raw || "";
          if (!raw) return;

          const parts = String(raw).split("\n");
          const courseText = parts[0] || "";
          const staffText = parts.slice(1).join(" ").trim();
          const maxWidth = data.cell.width - 6;

          let cursorY = data.cell.y + 10;
          const startX = data.cell.x + 3;

          // Course (bold)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          const courseLines = doc.splitTextToSize(courseText, maxWidth);
          courseLines.forEach((line) => {
            doc.text(line, startX, cursorY);
            cursorY += 9;
          });

          // Margin between course and staff
          cursorY += 4;

          // Staff (regular)
          if (staffText) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            const staffLines = doc.splitTextToSize(staffText, maxWidth);
            staffLines.forEach((line) => {
              doc.text(line, startX, cursorY);
              cursorY += 8;
            });
          }
        },
      });
    };

    renderTable([1, 2, 3, 4, 5, 6, 7, 8], 75);

      doc.save(`timetable_${selectedDegree || "degree"}_${selectedSemNumber || "sem"}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      showErrorToast("PDF export failed", err?.message || String(err));
    }
  };

  const handleLabAllocate = async () => {
    if (!selectedCell) return;
    if (!selectedSem || !selectedDept) {
      showErrorToast("Missing filters", "Please select filters first.");
      return;
    }
    if (!labCourseId) {
      showErrorToast("Missing course", "Please select course.");
      return;
    }

    const backendPeriod = getBackendPeriod(selectedCell.periodId);
    if (!backendPeriod) {
      showErrorToast("Invalid period", "Invalid period selected.");
      return;
    }

    try {
      if (allocateAllSections && labSections.length > 0) {
        const allocations = labSections.map((s) => ({
          sectionId: s.sectionId,
          labId: labAllocations[s.sectionId],
        }));

        const hasMissing = allocations.some((a) => !a.labId);
        if (hasMissing) {
          showErrorToast("Missing labs", "Please select lab room for every batch.");
          return;
        }

        const payload = {
          allocations,
          day: selectedCell.day,
          period: backendPeriod,
          semesterId: +selectedSem,
          courseId: +labCourseId,
          deptId: +selectedDept,
        };

        await axios.post(`${API_BASE_URL}/api/admin/timetable/allocate-multi`, payload);
      } else {
        if (!labId) {
          showErrorToast("Missing lab room", "Please select lab room.");
          return;
        }
        const payload = {
          semesterId: +selectedSem,
          deptId: +selectedDept,
          courseId: +labCourseId,
          sectionId: labSectionId ? +labSectionId : null,
          labId: +labId,
          day: selectedCell.day,
          period: backendPeriod,
        };

        await axios.post(`${API_BASE_URL}/api/admin/timetable/allocate-lab`, payload);
      }
      fetchTimetable();
      setShowCourseModal(false);
      showSuccessToast("Lab allocated successfully!");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        showInfoToast("Slot already allocated", err.response?.data?.message || "This slot is already filled.");
      } else {
        showErrorToast("Allocation failed", err.response?.data?.message || err.message);
      }
    }
  };

  const handleRemoveCourses = async (day, periodId) => {
    const backendPeriod = getBackendPeriod(periodId);
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
      showSuccessToast("Courses removed successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      showErrorToast("Remove failed", "Failed to remove courses");
    }
  };

  // --- RENDER HELPERS ---

  const renderPeriodHeader = (period) => {
    const icons = {
      break: <Coffee className="w-4 h-4" />,
      lunch: <UtensilsCrossed className="w-4 h-4" />,
      class: <Clock className="w-4 h-4" />,
    };

    return (
      <div className="p-1 text-center font-medium border-r bg-gray-50 text-gray-600 min-h-[60px] flex flex-col justify-center items-center overflow-hidden">
        <div className="flex items-center gap-1 mb-0.5">
          {icons[period.type]}
          <span className="text-[10px] uppercase font-bold">{period.name}</span>
        </div>
        <div className="text-[9px] text-gray-400 whitespace-nowrap">{period.time}</div>
      </div>
    );
  };

  const renderCell = (day, period) => {
    if (period.type !== "class") {
      return (
        <div className="p-1 h-20 bg-gray-100 text-center text-gray-400 border-r flex flex-col items-center justify-center text-[10px] font-bold">
          {period.type === "break" ? <Coffee className="w-5 h-5 mb-1 opacity-50"/> : <UtensilsCrossed className="w-5 h-5 mb-1 opacity-50"/>}
          <span className="hidden xl:block">{period.type.toUpperCase()}</span>
        </div>
      );
    }

    const entries = timetableData.filter(
      (e) => e.dayOfWeek === day && getFrontendId(e.periodNumber) === period.id
    );

    const selected = selectedCell?.day === day && selectedCell?.periodId === period.id;
    const uniqueCourseIds = [...new Set(entries.map((e) => e.courseId))];
    const isSingleCourse = uniqueCourseIds.length === 1 && entries.length > 0;
    const isLabSplit = isSingleCourse && entries.length > 1;

    return (
      <div
        className={`relative h-20 border-r border-b transition-all flex flex-col justify-center
          ${editMode ? "cursor-pointer hover:bg-indigo-50" : ""} 
          ${selected ? "bg-indigo-100 ring-2 ring-indigo-500 inset-0 z-10" : ""} 
          ${entries.length > 0 ? "bg-white" : "bg-gray-50/50"}
        `}
        onClick={() => handleCellClick(day, period.id, period.type)}
      >
        {entries.length > 0 ? (
          <div className="h-full w-full p-1 flex flex-col justify-between overflow-hidden">
            
            {isSingleCourse ? (
              // Regular Course or Lab
              <div className="flex flex-col h-full justify-center">
                <div className="font-bold text-[10px] md:text-xs text-gray-900 leading-tight line-clamp-2 text-center" title={entries[0].courseTitle}>
                  {entries[0].courseTitle}
                </div>
                <div className="text-[9px] text-gray-500 text-center mt-1 font-mono">
                  {entries[0].courseCode}
                </div>
                
                {isLabSplit && (
                  <div className="mt-1 flex justify-center">
                     <span className="inline-flex items-center gap-0.5 bg-blue-100 text-blue-800 text-[8px] px-1 py-0.5 rounded border border-blue-200 font-bold uppercase tracking-wider">
                       <Beaker className="w-2.5 h-2.5" /> Lab
                     </span>
                  </div>
                )}
              </div>
            ) : (
              // Elective Bucket
              <div className="text-center h-full flex flex-col justify-center items-center">
                <div className="font-bold text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                  Elective
                </div>
                <div className="text-[9px] text-purple-600 mt-1">
                  {entries.length} options
                </div>
              </div>
            )}

            {editMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCourses(day, period.id);
                }}
                className="absolute top-0 right-0 p-0.5 bg-red-100 text-red-600 hover:bg-red-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : editMode ? (
          <div className="flex items-center justify-center text-gray-300 text-xs h-full">
            +
          </div>
        ) : null}
      </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    // Changed max-w-7xl to w-full and added padding
    <div className="p-4 w-full bg-gray-100 min-h-screen font-sans">
      
      {/* Header & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600"/>
            Timetable Manager
          </h1>
          
          {selectedSem && (
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <button
                onClick={handleAutoGenerate}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${
                  isGenerating
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {isGenerating ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? "Generating..." : "Auto-Gen"}
              </button>

              <label className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                <input
                  type="checkbox"
                  className="accent-indigo-600"
                  checked={ignoreGlobalLabBusy}
                  onChange={(e) => setIgnoreGlobalLabBusy(e.target.checked)}
                  disabled={isGenerating}
                />
                Ignore other semesters' lab usage
              </label>

              <button
                onClick={() => setEditMode(!editMode)}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${
                  editMode
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-800 hover:bg-gray-900 text-white"
                }`}
              >
                {editMode ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                {editMode ? "Save" : "Edit"}
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating || timetableData.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${
                  isGenerating || timetableData.length === 0
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Compact Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={selectedDegree}
            onChange={(e) => {
              setSelectedDegree(e.target.value);
              setSelectedBatch("");
              setSelectedDept("");
              setSelectedSem("");
              setEditMode(false);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Degree...</option>
            {degrees.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setSelectedDept("");
              setSelectedSem("");
            }}
            disabled={!selectedDegree}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Batch...</option>
            {batches.filter((b) => b.degree === selectedDegree).map((b) => (
                <option key={b.batchId} value={b.batchId}>{b.branch} ({b.batchYears})</option>
            ))}
          </select>

          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedSem("");
            }}
            disabled={!selectedBatch}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Department...</option>
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
                  {dept.departmentCode}
                </option>
              ))}
          </select>

          <select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            disabled={!selectedDept}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Semester...</option>
            {semesters.map((sem) => (
              <option key={sem.semesterId} value={sem.semesterId}>Sem {sem.semesterNumber}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetable Display */}
      {selectedSem ? (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              {departments.find((d) => d.departmentId === +selectedDept)?.departmentCode} - 
              Sem {semesters.find((s) => s.semesterId === +selectedSem)?.semesterNumber}
            </h2>
            <div className="text-xs text-gray-500 font-mono">
              {timetableData.length} slots allocated
            </div>
          </div>
          
          {/* THE GRID: Removed overflow-x-auto, changed grid definition */}
          <div className="w-full">
            <div className="grid grid-cols-[60px_repeat(11,1fr)] w-full border-collapse">
              
              {/* Top-Left Corner */}
              <div className="bg-gray-100 border-r border-b p-2 flex items-center justify-center font-bold text-gray-400 text-[10px]">
                DAY
              </div>

              {/* Period Headers */}
              {periods.map((p) => (
                <div key={p.id} className="border-r border-b bg-gray-50">
                  {renderPeriodHeader(p)}
                </div>
              ))}
              
              {/* Rows */}
              {days.map((day) => (
                <React.Fragment key={day}>
                  {/* Day Label */}
                  <div className="bg-gray-100 border-r border-b flex items-center justify-center font-bold text-gray-700 text-xs writing-mode-vertical">
                    {day}
                  </div>
                  
                  {/* Period Cells */}
                  {periods.map((p) => (
                    <div key={`${day}-${p.id}`} className="border-r border-b min-w-0">
                      {renderCell(day, p)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Filter className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg">Select filters to view timetable</p>
        </div>
      )}

      {/* Modal - Unchanged logic, just ensure it renders above everything */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Assign Slot
              </h2>
              <button onClick={() => setShowCourseModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6 bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center">
              <div className="text-xs text-indigo-500 uppercase font-bold tracking-wider mb-1">Target Slot</div>
              <div className="text-lg font-bold text-indigo-900">
                {selectedCell?.day} • {periods.find((p) => p.id === selectedCell?.periodId)?.name}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Allocation Type</label>
                <select
                  value={allocationMode}
                  onChange={(e) => {
                    setAllocationMode(e.target.value);
                    setCustomCourseInput("");
                    setSelectedBucketId("");
                    setLabCourseId("");
                    setLabSectionId("");
                    setLabId("");
                    setAllocateAllSections(true);
                    setLabAllocations({});
                  }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  <option value="">Select Type...</option>
                  <option value="select">Regular Course</option>
                  <option value="manual">Manual Entry</option>
                  <option value="bucket">Elective Bucket</option>
                  <option value="lab">Lab (Physical)</option>
                </select>
              </div>

              {allocationMode === "select" && (
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Select Course</label>
                   <select
                    value={customCourseInput}
                    onChange={(e) => setCustomCourseInput(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="">Choose Course...</option>
                    {courses.map((c) => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.courseCode} - {c.courseTitle}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {allocationMode === "manual" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Activity Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Library, Seminar"
                    value={customCourseInput}
                    onChange={(e) => setCustomCourseInput(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              )}

              {allocationMode === "bucket" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Select Bucket</label>
                  <select
                    value={selectedBucketId}
                    onChange={(e) => setSelectedBucketId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="">Choose Bucket...</option>
                    {electiveBuckets.map((b) => (
                      <option key={b.bucketId} value={b.bucketId}>
                        {b.bucketName || `Bucket ${b.bucketNumber}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {allocationMode === "lab" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Select Lab Course</label>
                    <select
                      value={labCourseId}
                      onChange={(e) => setLabCourseId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    >
                      <option value="">Choose Course...</option>
                      {courses.map((c) => (
                        <option key={c.courseId} value={c.courseId}>
                          {c.courseCode} - {c.courseTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  {labSections.length > 0 && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input
                        type="checkbox"
                        checked={allocateAllSections}
                        onChange={(e) => setAllocateAllSections(e.target.checked)}
                      />
                      Allocate for all batches
                    </label>
                  )}

                  {!allocateAllSections && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Select Batch/Section</label>
                      <select
                        value={labSectionId}
                        onChange={(e) => setLabSectionId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        disabled={!labCourseId || loadingSections}
                      >
                        <option value="">
                          {loadingSections ? "Loading sections..." : "Common / No Section"}
                        </option>
                        {labSections.map((s) => (
                          <option key={s.sectionId} value={s.sectionId}>
                            {s.sectionName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {allocateAllSections && labSections.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Assign Lab Per Batch</label>
                      {labSections.map((s) => {
                        const usedLabIds = new Set(
                          Object.entries(labAllocations)
                            .filter(([key]) => String(key) !== String(s.sectionId))
                            .map(([, value]) => String(value))
                        );
                        return (
                          <div key={s.sectionId} className="flex gap-2 items-center">
                            <div className="text-xs font-semibold text-gray-600 w-28 truncate">{s.sectionName}</div>
                            <select
                              value={labAllocations[s.sectionId] || ""}
                              onChange={(e) =>
                                setLabAllocations((prev) => ({
                                  ...prev,
                                  [s.sectionId]: e.target.value,
                                }))
                              }
                              className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              disabled={!selectedDept || loadingLabs}
                            >
                              <option value="">
                                {loadingLabs ? "Loading labs..." : "Choose Lab..."}
                              </option>
                              {labRooms.map((l) => (
                                <option
                                  key={l.labId}
                                  value={l.labId}
                                  disabled={usedLabIds.has(String(l.labId))}
                                >
                                  {l.labName}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!allocateAllSections && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Select Lab Room</label>
                      <select
                        value={labId}
                        onChange={(e) => setLabId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        disabled={!selectedDept || loadingLabs}
                      >
                        <option value="">
                          {loadingLabs ? "Loading labs..." : "Choose Lab..."}
                        </option>
                        {labRooms.map((l) => (
                          <option key={l.labId} value={l.labId}>
                            {l.labName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8">
              {(allocationMode === "select" || allocationMode === "manual") && customCourseInput && (
                  <button
                    onClick={() => handleCourseAssign(customCourseInput)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all"
                  >
                    Confirm Allocation
                  </button>
                )}

              {allocationMode === "bucket" && selectedBucketId && (
                <button
                  onClick={handleAssignBucket}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg shadow-purple-200 transition-all"
                >
                  Assign Bucket
                </button>
              )}

              {allocationMode === "lab" && labCourseId && (
                <button
                  onClick={handleLabAllocate}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 transition-all"
                >
                  Allocate Lab
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;

