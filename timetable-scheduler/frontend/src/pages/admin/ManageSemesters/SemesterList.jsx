import React from 'react';
import { Calendar } from 'lucide-react';
import SemesterCard from './SemesterCard';

const SemesterList = ({ semesters, onSemesterClick, onDelete, onRefresh }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
      <Calendar className="w-5 h-5" />
      Existing Semesters (Last 5)
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {semesters.length > 0 ? (
        semesters.map((s, index) => (
          <SemesterCard 
            key={s.semesterId} 
            semester={s} 
            index={index} 
            onClick={onSemesterClick} 
            onDelete={onDelete} 
            onRefresh={onRefresh} 
          />
        ))
      ) : (
        <div className="md:col-span-full text-center py-8">
          <p className="text-gray-500">No semesters found matching your search criteria.</p>
        </div>
      )}
    </div>
  </div>
);

export default SemesterList;