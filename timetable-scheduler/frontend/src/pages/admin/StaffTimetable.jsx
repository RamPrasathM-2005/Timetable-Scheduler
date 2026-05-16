import React, { useEffect, useMemo, useState } from "react";
import { Users, Filter, CalendarClock, Search } from "lucide-react";
import { api } from "../../services/authService";

const StaffTimetable = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [timetableData, setTimetableData] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [error, setError] = useState("");

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const periods = [
    { id: 1, label: "Period 1" },
    { id: 2, label: "Period 2" },
    { id: 3, label: "Period 3" },
    { id: 4, label: "Period 4" },
    { id: 5, label: "Period 5" },
    { id: 6, label: "Period 6" },
    { id: 7, label: "Period 7" },
    { id: 8, label: "Period 8" },
  ];

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/admin/timetable/departments");
        setDepartments(
          (res.data.data || []).map((d) => ({
            Deptid: d.Deptid,
            Deptname: d.Deptname,
            Deptacronym: d.deptCode || d.Deptacronym,
          }))
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load departments");
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchStaffByDepartment = async () => {
      if (!selectedDept) {
        setStaffList([]);
        setSelectedStaffId("");
        setTimetableData([]);
        return;
      }
      setLoadingStaff(true);
      setError("");
      try {
        const res = await api.get("/admin/users");
        const allStaff = res.data.data || [];
        const filtered = allStaff.filter(
          (s) => String(s.departmentId) === String(selectedDept)
        );
        setStaffList(filtered);
        setSelectedStaffId("");
        setTimetableData([]);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load staff");
        setStaffList([]);
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaffByDepartment();
  }, [selectedDept]);

  const filteredStaff = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    if (!query) return staffList;
    return staffList.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(query) ||
        String(s.staffId || s.id || "").toLowerCase().includes(query)
    );
  }, [staffList, staffSearch]);

  const fetchTimetable = async (staffId) => {
    if (!staffId) return;
    setLoadingTimetable(true);
    setError("");
    try {
      const res = await api.get(`/admin/timetable/staff/${staffId}`);
      setTimetableData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load timetable");
      setTimetableData([]);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const timetableMap = useMemo(() => {
    const map = {};
    days.forEach((d) => {
      map[d] = {};
    });
    timetableData.forEach((entry) => {
      if (!entry.dayOfWeek || !entry.periodNumber) return;
      const day = String(entry.dayOfWeek).toUpperCase();
      const period = Number(entry.periodNumber);
      if (!map[day]) map[day] = {};
      map[day][period] = entry;
    });
    return map;
  }, [timetableData, days]);

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50 font-sans">
      <div className="flex items-center gap-3 mb-8">
        <CalendarClock className="w-9 h-9 text-indigo-600" />
        <h1 className="text-3xl font-black text-gray-900">Staff Timetable</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-indigo-500" />
          Filter Staff
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">-- Choose Department --</option>
              {departments.map((d) => (
                <option key={d.Deptid} value={d.Deptid}>
                  {d.Deptname}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Search Staff</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Search by name or staff ID"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                disabled={!selectedDept || loadingStaff}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Staff</label>
          <div className="relative">
            <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <select
              value={selectedStaffId}
              onChange={(e) => {
                const staffId = e.target.value;
                setSelectedStaffId(staffId);
                fetchTimetable(staffId);
              }}
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              disabled={!selectedDept || loadingStaff}
            >
              <option value="">
                {loadingStaff ? "Loading staff..." : "-- Select Staff --"}
              </option>
              {filteredStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.staffId || s.id})
                </option>
              ))}
            </select>
          </div>
          {!loadingStaff && selectedDept && filteredStaff.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No staff found for this department.</p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Timetable</h2>
        {!selectedStaffId ? (
          <div className="text-center py-12 text-gray-400">
            Select a staff member to view their timetable.
          </div>
        ) : loadingTimetable ? (
          <div className="text-center py-12 text-gray-500">Loading timetable...</div>
        ) : timetableData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No timetable entries found for this staff.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase px-3 py-2 border-b">Day</th>
                  {periods.map((p) => (
                    <th
                      key={p.id}
                      className="text-left text-xs font-bold text-gray-500 uppercase px-3 py-2 border-b"
                    >
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day} className="border-b last:border-b-0">
                    <td className="px-3 py-3 text-sm font-bold text-gray-700">{day}</td>
                    {periods.map((p) => {
                      const entry = timetableMap[day]?.[p.id];
                      return (
                        <td key={`${day}-${p.id}`} className="px-3 py-3 text-sm">
                          {entry ? (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                              <div className="text-xs font-bold text-indigo-700">
                                {entry.courseCode || entry.courseId}
                              </div>
                              <div className="text-xs text-gray-700">{entry.courseTitle}</div>
                              <div className="text-[10px] text-gray-500 mt-1">
                                {entry.sectionName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffTimetable;
