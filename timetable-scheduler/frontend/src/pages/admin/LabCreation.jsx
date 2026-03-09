import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Server, Building2 } from 'lucide-react';

// --- 1. API INSTANCE CONFIGURATION ---
const api = axios.create({
  baseURL: "http://localhost:4000/api/admin", // Base URL for admin routes
});

// Interceptor: Automatically adds the Token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
// -------------------------------------

const LabCreation = () => {
  const [labs, setLabs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [formData, setFormData] = useState({ labName: '', capacity: 60 });
  const [loading, setLoading] = useState(false);

  // 1. Fetch Departments on Load
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        // No need for manual headers or full URL
        const res = await api.get('/timetable/departments');
        setDepartments(res.data.data);
      } catch (err) {
        console.error("Error fetching depts", err);
      }
    };
    fetchDepts();
  }, []);

  // 2. Fetch Labs when Department Changes
  const fetchLabs = async () => {
    if (!selectedDept) return;
    try {
      const res = await api.get(`/labs/department/${selectedDept}`);
      setLabs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchLabs(); }, [selectedDept]);

  // 3. Handle Create Lab
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDept) return alert("Please select a department first");
    
    setLoading(true);
    try {
      await api.post('/labs', { 
        ...formData, 
        Deptid: selectedDept 
      });
      
      alert("✅ Lab Created Successfully!");
      setFormData({ labName: '', capacity: 60 });
      fetchLabs(); // Refresh list
    } catch (err) {
      alert("❌ Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Delete
  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure? This will remove this lab from future allocations.")) return;
    try {
      await api.delete(`/labs/${id}`);
      fetchLabs();
    } catch (err) {
      alert("Failed to delete lab");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50 font-sans">
      <div className="flex items-center gap-3 mb-8">
        <Server className="w-10 h-10 text-indigo-600" />
        <h1 className="text-3xl font-black text-gray-900">Physical Lab Management</h1>
      </div>

      {/* --- Department Selector --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
        <label className="block text-sm font-bold text-gray-700 mb-2">Select Department</label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <select 
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">-- Choose Department --</option>
              {departments.map(d => (
                <option key={d.Deptid} value={d.Deptid}>{d.Deptname}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- Left: Creation Form --- */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-600 h-fit">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add New Lab
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Lab Name</label>
              <input 
                type="text" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none" 
                placeholder="e.g. Cisco Networking Lab"
                value={formData.labName}
                onChange={e => setFormData({...formData, labName: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Capacity</label>
              <input 
                type="number" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none" 
                value={formData.capacity}
                onChange={e => setFormData({...formData, capacity: e.target.value})}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !selectedDept}
              className={`w-full py-3 rounded-lg font-bold text-white shadow transition-transform active:scale-95
                ${loading || !selectedDept ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? "Saving..." : "Create Lab Room"}
            </button>
          </form>
        </div>

        {/* --- Right: List of Labs --- */}
        <div className="lg:col-span-2">
          {selectedDept ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labs.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">
                  No labs found for this department. Add one!
                </div>
              ) : (
                labs.map(lab => (
                  <div key={lab.labId} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{lab.labName}</h3>
                      <p className="text-sm text-gray-500">Capacity: <span className="font-mono bg-gray-100 px-2 rounded">{lab.capacity} students</span></p>
                    </div>
                    <button 
                      onClick={() => handleDelete(lab.labId)} 
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Delete Lab"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              Select a department to view or manage labs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabCreation;