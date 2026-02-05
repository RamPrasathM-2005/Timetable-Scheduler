import axios from 'axios';

const API_URL = 'http://localhost:4000/api/staff';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- HELPERS ---
const splitIds = (id) => (id ? String(id).split('_') : []);

// Map each student RegNo to their Course Code to know where to save marks
const getStudentCourseMap = async (codes, sectionIds) => {
  const map = {};
  const sIds = splitIds(sectionIds);
  
  const promises = codes.map((code, idx) => {
    const secId = sIds[idx] || sIds[0];
    return api.get(`/students/${code}/section/${secId}`).then(res => ({
      code,
      students: res.data.data || []
    }));
  });

  const results = await Promise.all(promises);
  results.forEach(({ code, students }) => {
    students.forEach(s => {
      map[s.regno] = code;
    });
  });
  
  return map;
};

// --- MARKS FUNCTIONS ---

export const getStudentCOMarks = async (courseCode) => {
  try {
    const codes = splitIds(courseCode);
    const promises = codes.map(code => api.get(`/marks/co/${code}`));
    const responses = await Promise.all(promises);

    let allStudents = [];
    let partitionData = {};

    responses.forEach((res, index) => {
      // FIX: Handle nested response structure { data: { students: ... } }
      const responseBody = res.data; 
      const innerData = responseBody.data || responseBody; 

      if (index === 0) partitionData = innerData.partitions || {};
      
      if (innerData.students && Array.isArray(innerData.students)) {
        allStudents = [...allStudents, ...innerData.students];
      }
    });

    const uniqueStudents = [...new Map(allStudents.map(item => [item.regno, item])).values()];
    return { students: uniqueStudents, partitions: partitionData };
  } catch (error) {
    console.error('Error in getStudentCOMarks:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch CO marks');
  }
};

export const updateStudentCOMark = async (courseCode, regno, coId, consolidatedMark) => {
  try {
    const response = await api.put(`/marks/co/${regno}/${coId}`, { consolidatedMark });
    return response.data;
  } catch (error) {
    console.error('Error in updateStudentCOMark:', error);
    throw new Error(error.response?.data?.message || 'Failed to update CO mark');
  }
};

// --- SYNCED TOOL FUNCTIONS ---

export const saveToolsForCO = async (coId, toolsData, compositeCourseCode) => {
  const codes = splitIds(compositeCourseCode);
  const primaryCode = codes[0];
  const tools = Array.isArray(toolsData) ? toolsData : toolsData.tools;

  try {
    await api.post(`/tools/${coId}/save`, { tools });

    if (codes.length > 1) {
      const primaryCosRes = await api.get(`/cos/${primaryCode}`);
      const primaryCo = (primaryCosRes.data.data || []).find(c => c.coId === coId);
      
      if (primaryCo) {
        for (let i = 1; i < codes.length; i++) {
          const siblingCode = codes[i];
          const siblingCosRes = await api.get(`/cos/${siblingCode}`);
          const siblingCo = (siblingCosRes.data.data || []).find(c => c.coNumber === primaryCo.coNumber);
          
          if (siblingCo) {
            const toolsForSibling = tools.map(({ toolId, uniqueId, ...rest }) => rest);
            await api.post(`/tools/${siblingCo.coId}/save`, { tools: toolsForSibling });
          }
        }
      }
    }
    return { success: true, message: 'Tools synced successfully' };
  } catch (error) {
    console.error('Error saving tools:', error);
    throw error;
  }
};

export const deleteTool = async (toolId, compositeCourseCode) => {
  try {
    await api.delete(`/tools/${toolId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting tool:', error);
    throw error;
  }
};

// --- SYNCED MARK SAVING ---

export const saveStudentMarksForTool = async (toolId, marksData, compositeCourseCode, compositeSectionId) => {
  const codes = splitIds(compositeCourseCode);
  const marksArray = Array.isArray(marksData) ? marksData : marksData.marks;

  try {
    if (codes.length <= 1) {
      const payload = Array.isArray(marksData) ? { marks: marksData } : marksData;
      await api.post(`/marks/${toolId}`, payload);
    } else {
      const primaryCode = codes[0];
      const studentMap = await getStudentCourseMap(codes, compositeSectionId);
      
      const marksByCourse = {};
      marksArray.forEach(m => {
        const course = studentMap[m.regno];
        if (course) {
          if (!marksByCourse[course]) marksByCourse[course] = [];
          marksByCourse[course].push(m);
        }
      });

      const primaryCosRes = await api.get(`/cos/${primaryCode}`);
      const primaryCos = primaryCosRes.data.data || [];
      
      let primaryTool = null;
      let primaryCo = null;

      for (const co of primaryCos) {
        const toolsRes = await api.get(`/tools/${co.coId}`);
        const tools = toolsRes.data.data || [];
        const found = tools.find(t => t.toolId === toolId);
        if (found) {
          primaryTool = found;
          primaryCo = co;
          break;
        }
      }

      if (!primaryTool) throw new Error("Primary tool details could not be found.");

      for (const code of codes) {
        const courseMarks = marksByCourse[code] || [];
        if (courseMarks.length === 0) continue;

        if (code === primaryCode) {
           await api.post(`/marks/${toolId}`, { marks: courseMarks });
        } else {
           const siblingCosRes = await api.get(`/cos/${code}`);
           const siblingCo = (siblingCosRes.data.data || []).find(c => c.coNumber === primaryCo.coNumber);
           
           if (!siblingCo) continue;

           const siblingToolsRes = await api.get(`/tools/${siblingCo.coId}`);
           let siblingTool = (siblingToolsRes.data.data || []).find(t => t.toolName === primaryTool.toolName);

           if (!siblingTool) {
             const createRes = await api.post(`/tools/${siblingCo.coId}`, {
               toolName: primaryTool.toolName,
               weightage: primaryTool.weightage,
               maxMarks: primaryTool.maxMarks
             });
             const newId = createRes.data.toolId || createRes.data.insertId;
             siblingTool = { toolId: newId };
           }

           await api.post(`/marks/${siblingTool.toolId}`, { marks: courseMarks });
        }
      }
    }
    return { success: true, message: 'Marks saved successfully across courses' };
  } catch (error) {
    console.error('Error in saveStudentMarksForTool:', error);
    throw error;
  }
};

export const getStudentMarksForTool = async (toolId, compositeCourseCode) => {
  const codes = splitIds(compositeCourseCode);
  
  try {
    if (codes.length <= 1) {
      const response = await api.get(`/marks/${toolId}`);
      return response.data.data || [];
    }

    const primaryCode = codes[0];
    const primaryCosRes = await api.get(`/cos/${primaryCode}`);
    let primaryToolName = null;
    let primaryCoNum = null;

    for (const co of primaryCosRes.data.data || []) {
      const tRes = await api.get(`/tools/${co.coId}`);
      const found = (tRes.data.data || []).find(t => t.toolId === parseInt(toolId));
      if (found) {
        primaryToolName = found.toolName;
        primaryCoNum = co.coNumber;
        break;
      }
    }

    if (!primaryToolName) {
       const res = await api.get(`/marks/${toolId}`);
       return res.data.data || [];
    }

    let allMarks = [];
    for (const code of codes) {
      const coRes = await api.get(`/cos/${code}`);
      const co = (coRes.data.data || []).find(c => c.coNumber === primaryCoNum);
      if (co) {
        const tRes = await api.get(`/tools/${co.coId}`);
        const tool = (tRes.data.data || []).find(t => t.toolName === primaryToolName);
        if (tool) {
          const mRes = await api.get(`/marks/${tool.toolId}`);
          if (mRes.data.data) allMarks = [...allMarks, ...mRes.data.data];
        }
      }
    }
    return allMarks;

  } catch (error) {
    console.error('Error in getStudentMarksForTool:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch marks');
  }
};

// --- STANDARD EXPORTS ---
export const getCoursePartitions = async (courseCode) => {
  const codes = splitIds(courseCode);
  const response = await api.get(`/partitions/${codes[0]}`);
  return response.data.data;
};

export const saveCoursePartitions = async (courseCode, partitions) => {
  const codes = splitIds(courseCode);
  const promises = codes.map(code => api.post(`/partitions/${code}`, partitions));
  const responses = await Promise.all(promises);
  return responses[0].data;
};

export const updateCoursePartitions = async (courseCode, partitions) => {
  const codes = splitIds(courseCode);
  const promises = codes.map(code => api.put(`/partitions/${code}`, partitions));
  const responses = await Promise.all(promises);
  return responses[0].data;
};

export const getCOsForCourse = async (courseCode) => {
  const codes = splitIds(courseCode);
  const response = await api.get(`/cos/${codes[0]}`);
  return response.data.data || [];
};

export const getToolsForCO = async (coId) => {
  const response = await api.get(`/tools/${coId}`);
  return response.data.data || [];
};

export const getStudentsForSection = async (courseCode, sectionId) => {
  try {
    const codes = splitIds(courseCode);
    const sections = splitIds(sectionId);
    const promises = codes.map((code, index) => {
      const sec = sections[index] || sections[0];
      return api.get(`/students/${code}/section/${sec}`);
    });
    const responses = await Promise.all(promises);
    let allStudents = [];
    responses.forEach(res => {
      if (res.data.data) allStudents = [...allStudents, ...res.data.data];
    });
    const uniqueStudents = [...new Map(allStudents.map(item => [item.regno, item])).values()];
    uniqueStudents.sort((a, b) => a.regno.localeCompare(b.regno));
    return uniqueStudents;
  } catch (error) {
    console.error('Error in getStudentsForSection:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch students');
  }
};

export const getMyCourses = async () => {
  const response = await api.get(`/courses`);
  return response.data.data || [];
};

export const createTool = async (coId, tool) => {
  const response = await api.post(`/tools/${coId}`, tool);
  return response.data;
};

export const updateTool = async (toolId, tool) => {
  const response = await api.put(`/tools/${toolId}`, tool);
  return response.data;
};

export const importMarksForTool = async (toolId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/marks/${toolId}/import`, formData);
  return response.data;
};

export const exportCoWiseCsv = async (coId) => {
  const response = await api.get(`/export/co/${coId}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `co_${coId}_marks.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportCourseWiseCsv = async (courseCode) => {
  const codes = splitIds(courseCode);
  const response = await api.get(`/export/course/${codes[0]}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${codes[0]}_marks.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};