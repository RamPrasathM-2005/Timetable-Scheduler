// src/services/studentService.js
import { api } from './authService';

export const fetchStudentDetails = async () => {
  try {
    const response = await api.get("/student/details");
    console.log(response);
    if (response.data.status === "success") {
      return response.data.data;
    } else {
      throw new Error(
        response.data.message || "Failed to fetch student details"
      );
    }
  } catch (error) {
    console.error("fetchStudentDetails error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch student details"
    );
  }
};

export const fetchSemesters = async (batchYear) => {
  try {
    console.log('Fetching semesters for batchYear:', batchYear);
    const response = await api.get('/student/semesters', {
      params: { batchYear }
    });
    console.log('Semesters response:', response.data);
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data.message || "Failed to fetch semesters");
    }
  } catch (error) {
    console.error("fetchSemesters error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch semesters"
    );
  }
};

export const fetchMandatoryCourses = async (semesterId) => {
  try {
    const response = await api.get('/student/courses/mandatory', {
      params: { semesterId }
    });
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(
        response.data.message || "Failed to fetch mandatory courses"
      );
    }
  } catch (error) {
    console.error("fetchMandatoryCourses error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch mandatory courses"
    );
  }
};

export const fetchElectiveBuckets = async (semesterId) => {
  try {
    const response = await api.get('/student/elective-buckets', {
      params: { semesterId }
    });
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(
        response.data.message || "Failed to fetch elective buckets"
      );
    }
  } catch (error) {
    console.error("fetchElectiveBuckets error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch elective buckets"
    );
  }
};

export const allocateElectives = async (semesterId, selections) => {
  try {
    const response = await api.post("/student/allocate-electives", {
      semesterId,
      selections,
    });
    if (response.data.status === 'success') {
      return response.data;
    } else {
      throw new Error(response.data.message || "Failed to allocate electives");
    }
  } catch (error) {
    console.error("allocateElectives error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to allocate electives"
    );
  }
};

export const fetchEnrolledCourses = async (semesterId) => {
  try {
    console.log('Fetching enrolled courses for semesterId:', semesterId);
    const response = await api.get('/student/enrolled-courses', {
      params: { semesterId }
    });
    console.log('Enrolled courses response:', response.data);
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(
        response.data.message || "Failed to fetch enrolled courses"
      );
    }
  } catch (error) {
    console.error("fetchEnrolledCourses error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch enrolled courses"
    );
  }
};

export const fetchAttendanceSummary = async (semesterId) => {
  try {
    console.log('Fetching attendance summary for semesterId:', semesterId);
    const response = await api.get('/student/attendance-summary', {
      params: { semesterId }
    });
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(
        response.data.message || "Failed to fetch attendance summary"
      );
    }
  } catch (error) {
    console.error("fetchAttendanceSummary error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch attendance summary"
    );
  }
};

export const fetchUserId = async () => {
  try {
    const response = await api.get("/student/userid");
    if (response.data.status === "success") {
      return response.data.data.Userid;
    } else {
      throw new Error(response.data.message || "Failed to fetch Userid");
    }
  } catch (error) {
    console.error("fetchUserId error:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch Userid");
  }
};


export const fetchNptelCourses = async (semesterId) => {
  try {
    const response = await api.get('/student/nptel-courses', {
      params: { semesterId }
    });
    if (response.data.status === 'success') {
      return response.data.data;
    }
    throw new Error(response.data.message);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch NPTEL courses');
  }
};

export const enrollNptelCourses = async (semesterId, nptelCourseIds) => {
  try {
    const response = await api.post('/student/nptel-enroll', {
      semesterId,
      nptelCourseIds
    });
    if (response.data.status === 'success') {
      return response.data;
    }
    throw new Error(response.data.message);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to enroll in NPTEL courses');
  }
};

export const fetchStudentNptelEnrollments = async () => {
  try {
    const response = await api.get('/student/nptel-enrollments');
    if (response.data.status === 'success') {
      return response.data.data;
    }
    throw new Error(response.data.message);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch NPTEL enrollments');
  }
};

export const requestNptelCreditTransfer = async (enrollmentId) => {
  try {
    const response = await api.post('/student/nptel-credit-transfer', { enrollmentId });
    if (response.data.status === 'success') {
      return response.data;
    }
    throw new Error(response.data.message);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to request credit transfer');
  }
};

export const fetchOecPecProgress = async () => {
  try {
    const response = await api.get('/student/oec-pec-progress');
    if (response.data.status === 'success') {
      return response.data.data;
    }
    throw new Error(response.data.message);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch OEC/PEC progress');
  }
};

export const fetchStudentAcademicIds = async () => {
  try {
    const response = await api.get("/student/academic-ids");
    console.log("Academic IDs response:", response);

    if (response.data.status === "success") {
      return response.data.data; // { deptId, batchId, semesterId }
    } else {
      throw new Error(
        response.data.message || "Failed to fetch academic IDs"
      );
    }
  } catch (error) {
    console.error("fetchStudentAcademicIds error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch academic IDs"
    );
  }
}