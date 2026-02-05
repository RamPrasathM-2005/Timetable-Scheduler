import React from 'react';
import { Search } from 'lucide-react';

const Filters = ({ filters, setFilters, nameSearch, setNameSearch, sortBy, handleSort, departments, semesters, staffList }) => {
  const departmentOptions = departments.length > 0
    ? [...new Set(departments.map(dept => dept.departmentName))].filter(d => d).sort()
    : [...new Set(staffList.map(staff => staff.departmentName))].filter(d => d).sort();
  const semesterOptions = [...new Set(semesters.map(sem => String(sem.semesterNumber)))].filter(sem => sem).sort((a, b) => a - b);
  const batchOptions = [...new Set(semesters.map(sem => sem.batchYears))].filter(batch => batch).sort();

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
      <div className="flex flex-wrap gap-4 items-end justify-center">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Search by Name</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter staff name..."
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
          <select
            value={filters.dept}
            onChange={e => setFilters({ ...filters, dept: e.target.value, batch: '' })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <option value="">All Departments</option>
            {departmentOptions.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Semester</label>
          <select
            value={filters.semester}
            onChange={e => setFilters({ ...filters, semester: e.target.value, batch: '' })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <option value="">All Semesters</option>
            {semesterOptions.map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Batch</label>
          <select
            value={filters.batch}
            onChange={e => setFilters({ ...filters, batch: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <option value="">All Batches</option>
            {batchOptions.map(batch => <option key={batch} value={batch}>{batch}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={e => handleSort(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <option value="staffId">Staff ID</option>
            <option value="departmentName">Department</option>
            <option value="allocatedCourses">Course Count</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Filters;