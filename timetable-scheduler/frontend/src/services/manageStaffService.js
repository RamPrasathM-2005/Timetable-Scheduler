import { api } from '../services/authService.js'; // Adjust path to your api.js file

const API_BASE = 'http://localhost:4000/api';

// Simple in-memory cache for sections
const sectionCache = new Map();

// Clear the entire section cache
export const clearSectionCache = () => {
  console.log('Clearing entire section cache');
  sectionCache.clear();
};

const manageStaffService = {
  getDepartments: async () => {
    try {
      const res = await api.get(`${API_BASE}/departments`);
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching departments:', err.response?.data || err.message);
      return [];
    }
  },

  getSemesters: async () => {
    try {
      const res = await api.get(`${API_BASE}/admin/semesters`);
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching semesters:', err.response?.data || err.message);
      return [];
    }
  },

  getBatches: async () => {
    try {
      const res = await api.get(`${API_BASE}/admin/batches`);
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching batches:', err.response?.data || err.message);
      return [];
    }
  },

  getUsers: async () => {
    try {
      const res = await api.get(`${API_BASE}/admin/users`);
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching users:', err.response?.data || err.message);
      return [];
    }
  },

  getCourses: async () => {
    try {
      const res = await api.get(`${API_BASE}/admin/courses`);
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching courses:', err.response?.data || err.message);
      return [];
    }
  },

  getCourseSections: async (courseId) => {
    try {
      const cacheKey = `sections_${courseId}`;
      if (sectionCache.has(cacheKey)) {
        console.log(`Returning cached sections for course ${courseId}:`, sectionCache.get(cacheKey));
        return sectionCache.get(cacheKey);
      }
      const res = await api.get(`${API_BASE}/admin/courses/${courseId}/sections`, {
        params: { t: Date.now() }, // Cache buster
      });
      console.log(`getCourseSections response for course ${courseId}:`, res.data);
      const sections = res.data.status === 'success' ? res.data.data : [];
      sectionCache.set(cacheKey, sections);
      return sections;
    } catch (err) {
      console.error(`Error fetching sections for course ${courseId}:`, err.response?.data || err.message);
      return [];
    }
  },

  addSections: async (courseId, numberOfSections) => {
    try {
      const res = await api.post(`${API_BASE}/admin/courses/${courseId}/sections`, { numberOfSections });
      if (res.data.status !== 'success') {
        throw new Error(res.data.message || 'Failed to add sections');
      }
      sectionCache.delete(`sections_${courseId}`);
      console.log(`Cleared cache for course ${courseId} after adding sections`);
      return res;
    } catch (err) {
      console.error(`Error adding sections for course ${courseId}:`, err.response?.data || err.message);
      throw err;
    }
  },

  allocateCourse: async (staffId, courseId, sectionId, departmentId) => {
    try {
      const res = await api.post(`${API_BASE}/admin/courses/${courseId}/staff`, {
        Userid: staffId,
        courseId,
        sectionId,
        departmentId,
      });
      if (res.data.status !== 'success') {
        throw new Error(res.data.message || 'Failed to allocate course');
      }
      return res;
    } catch (err) {
      console.error(`Error allocating course for staff ${staffId}, course ${courseId}:`, err.response?.data || err.message);
      throw err;
    }
  },

  updateCourseAllocation: async (staffCourseId, payload) => {
    try {
      const res = await api.patch(`${API_BASE}/admin/staff-courses/${staffCourseId}`, payload);
      if (res.data.status !== 'success') {
        throw new Error(res.data.message || 'Failed to update course allocation');
      }
      return res;
    } catch (err) {
      console.error(`Error updating course allocation ${staffCourseId}:`, err.response?.data || err.message);
      throw err;
    }
  },

  removeCourseAllocation: async (staffCourseId) => {
    try {
      const res = await api.delete(`${API_BASE}/admin/staff-courses/${staffCourseId}`);
      if (res.data.status !== 'success') {
        throw new Error(res.data.message || 'Failed to remove course allocation');
      }
      return res;
    } catch (err) {
      console.error(`Error removing course allocation ${staffCourseId}:`, err.response?.data || err.message);
      throw err;
    }
  },

  getEnrolledStudents: async (courseCode, sectionId) => {
    try {
      const res = await api.get(`${API_BASE}/admin/students/enrolled-courses`, { params: { courseCode, sectionId } });
      return res.data.status === 'success' ? res.data.data : [];
    } catch (err) {
      console.error(`Error fetching enrolled students for course ${courseCode}, section ${sectionId}:`, err.response?.data || err.message);
      return [];
    }
  },
};

export default manageStaffService;