// Modified adminroutes.js
import express from "express";
import {
  addSemester,
  deleteSemester,
  getAllSemesters,
  getSemester,
  updateSemester,
  getSemestersByBatchBranch,
} from "../../controllers/semesterController.js";
import {
  addCourse,
  getAllCourse,
  getCourseBySemester,
  updateCourse,
  deleteCourse,
  importCourses,
} from "../../controllers/subjectController.js";
import {
  allocateStaffToCourse,
  allocateCourseToStaff,
  updateStaffAllocation,
  getStaffAllocationsByCourse,
  getCourseAllocationsByStaff,
  deleteStaffAllocation,
  getUsers,
  getCourseAllocationsByStaffEnhanced,
  updateStaffCourseBatch,
} from "../../controllers/staffCourseController.js";

import {
  getSectionsForCourse,
  addSectionsToCourse,
  updateSectionsForCourse,
  deleteSection,
  getSections,
} from "../../controllers/sectionController.js";

import {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchByDetails,
} from "../../controllers/batchController.js";
import {
  getAllTimetableBatches,
  getAllTimetableDepartments,
  getTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  getTimetableByFilters,
  getElectiveBucketsBySemester,
  getCoursesInBucket,
  autoGenerateTimetable
} from "../../controllers/timetableController.js";

import {
  getElectiveBuckets,
  createElectiveBucket,
  addCoursesToBucket,
  deleteElectiveBucket,
  removeCourseFromBucket,
  updateElectiveBucketName,
} from "../../controllers/electiveBucketController.js";
import {
  getAllRegulations,
  importRegulationCourses,
  createVertical,
  getVerticalsByRegulation,
  getAvailableCoursesForVertical,
  allocateCoursesToVertical,
  allocateRegulationToBatch,
  getCoursesByVertical, // Added this import
  getElectivesForSemester, // Added this import
} from "../../controllers/regulationController.js";
import { protect } from "../../controllers/auth/authController.js";

import multer from 'multer';



const upload = multer({ dest: 'tmp/' });

const router = express.Router();

// Base API: http://localhost:4000/api/admin

/* =========================
   📌 Semester Routes
   ========================= */
router.route("/semesters").post(protect, addSemester).get(protect, getAllSemesters);
router.get("/semesters/search", protect, getSemester);
router.get("/semesters/by-batch-branch", protect, getSemestersByBatchBranch);
router.route("/semesters/:semesterId").put(protect, updateSemester).delete(protect, deleteSemester);

/* =========================
   📌 Course Routes
   ========================= */
router
  .route("/semesters/:semesterId/courses")
  .post(protect, addCourse)
  .get(protect, getCourseBySemester);

router
  .route("/courses")
  .get(protect, getAllCourse)
  .post(protect, importCourses);

router
  .route("/courses/:courseId")
  .put(protect, updateCourse)
  .delete(protect, deleteCourse);

/* =========================
   📌 Staff-Course Allocation Routes
   ========================= */
router.get("/users", protect, getUsers);
router.post("/courses/:courseId/staff", protect, allocateStaffToCourse);
router.post("/staff/:Userid/courses", protect, allocateCourseToStaff);
router.put("/staff-courses/:staffCourseId", protect, updateStaffAllocation);
router.patch("/staff-courses/:staffCourseId", protect, updateStaffCourseBatch);
router.get("/courses/:courseId/staff", protect, getStaffAllocationsByCourse);
router.get("/staff/:Userid/courses", protect, getCourseAllocationsByStaff);
router.delete("/staff-courses/:staffCourseId", protect, deleteStaffAllocation);
router.get("/staff/:Userid/courses-enhanced", protect, getCourseAllocationsByStaffEnhanced);

/* =========================
   📌 Section Routes
   ========================= */
router.get("/sections", protect, getSections);
router.get("/courses/:courseId/sections", protect, getSectionsForCourse);
router.post("/courses/:courseId/sections", protect, addSectionsToCourse);
router.put("/courses/:courseId/sections", protect, updateSectionsForCourse);
router.delete("/courses/:courseId/sections/:sectionName", protect, deleteSection);


/* =========================
   📌 Batch Routes
   ========================= */
router.get("/batches/find", protect, getBatchByDetails);
router.route("/batches").get(protect, getAllBatches).post(protect, createBatch);
router
  .route("/batches/:batchId")
  .get(protect, getBatchById)
  .put(protect, updateBatch)
  .delete(protect, deleteBatch);

/* =========================
   📌 Timetable Routes
   ========================= */
router.get("/timetable/batches", protect, getAllTimetableBatches);
router.post('/timetable/generate/:semesterId', protect, autoGenerateTimetable);
router.get("/timetable/departments", protect, getAllTimetableDepartments);
router.get("/timetable/by-filters", protect, getTimetableByFilters);
router.get("/timetable/semester/:semesterId", protect, getTimetable);
router.post("/timetable/entry", protect, createTimetableEntry);
router.put("/timetable/entry/:timetableId", protect, updateTimetableEntry);
router.delete("/timetable/entry/:timetableId", protect, deleteTimetableEntry);
router.get("/elective-buckets/:semesterId", getElectiveBucketsBySemester);
router.get("/bucket-courses/:bucketId", getCoursesInBucket);
/* =========================
   📌 Elective Bucket Routes
   ========================= */
router.get("/semesters/:semesterId/buckets", protect, getElectiveBuckets);
router.post("/semesters/:semesterId/buckets", protect, createElectiveBucket);
router.put("/buckets/:bucketId", protect, updateElectiveBucketName);
router.post("/buckets/:bucketId/courses", protect, addCoursesToBucket);
router.delete("/buckets/:bucketId", protect, deleteElectiveBucket);
router.delete("/buckets/:bucketId/courses/:courseId", protect, removeCourseFromBucket);
router.get('/regulations/:regulationId/electives/:semesterNumber', protect, getElectivesForSemester);


/* =========================
   📌 Regulation Routes
   ========================= */
router.route('/regulations').get(protect, getAllRegulations);
router.route('/regulations/courses').post(protect, importRegulationCourses);
router.route('/regulations/verticals').post(protect, createVertical);
router.route('/regulations/:regulationId/verticals').get(protect, getVerticalsByRegulation);
router.route('/regulations/:regulationId/courses/available').get(protect, getAvailableCoursesForVertical);
router.route('/regulations/verticals/courses').post(protect, allocateCoursesToVertical);
router.route('/regulations/verticals/:verticalId/courses').get(protect, getCoursesByVertical); // Added this route
router.route('/regulations/allocate-to-batch').post(protect, allocateRegulationToBatch); // Added this route





export default router;