import React, { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

const ImportModal = ({
  semesters,
  setShowImportModal,
  onImport,
}) => {
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [file, setFile] = useState(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a valid Excel file (.xls or .xlsx)');
        setFile(null);
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = () => {
    if (!selectedSemesterId) {
      toast.error('Please select a semester');
      return;
    }
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    onImport(file, selectedSemesterId);
    setShowImportModal(false);
    setFile(null);
    setSelectedSemesterId('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Import Courses</h3>
          <button 
            onClick={() => {
              setShowImportModal(false);
              setFile(null);
              setSelectedSemesterId('');
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Semester Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Target Semester</label>
            <div className="relative">
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="w-full appearance-none px-4 py-3 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white font-medium text-slate-700 outline-none"
              >
                <option value="">Select a Semester</option>
                {semesters.map(sem => (
                  <option key={sem.semesterId} value={sem.semesterId}>
                    Sem {sem.semesterNumber} - {sem.branch} ({sem.batch})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
            </div>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Excel File</label>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${file ? 'border-blue-500 bg-blue-50/30' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
              <div className="flex flex-col items-center justify-center">
                <div className={`p-4 rounded-full mb-3 ${file ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Upload className="w-8 h-8" />
                </div>
                
                <label htmlFor="file-upload" className="cursor-pointer relative z-10">
                  <span className="text-blue-600 font-bold hover:underline">Click to upload</span>
                  <span className="text-slate-500 font-medium"> or drag and drop</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-400 mt-2 font-medium">Supported formats: .xls, .xlsx</p>
              </div>
            </div>
          </div>

          {/* Selected File Preview */}
          {file && (
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                <div className="flex items-center overflow-hidden">
                  <div className="bg-green-100 p-2 rounded-lg text-green-700 mr-3 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); document.getElementById('file-upload').value = ''; }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
            </div>
          )}

          {/* Format Info */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
             <div className="text-xs text-amber-900">
                <p className="font-bold mb-1">Required Excel Columns:</p>
                <p className="font-mono opacity-90 leading-relaxed">
                  S. No, Course Code, Course Title, Category, L, T, P, E, Total Contact Periods, Credits, Min Marks, Max Marks
                </p>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
          <button className="text-sm text-slate-500 hover:text-slate-700 font-medium hover:underline">
            Need help?
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowImportModal(false);
                setFile(null);
                setSelectedSemesterId('');
              }}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedSemesterId || !file}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl focus:ring-4 focus:ring-blue-100 transition-all shadow-md flex items-center gap-2
                ${(!selectedSemesterId || !file) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
            >
              Import Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;