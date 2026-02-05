import express from "express";
import {
  getRegulationByBatchAndDept,
  getVerticalsByRegulation,
  getVerticalCourses,
  allocateTimetableSlot,
} from "../../controllers/verticalController.js"; // ← FIXED PATH

const router = express.Router();

// Get regulation by batch + dept
router.get("/regulation", getRegulationByBatchAndDept);

// Get all verticals for a regulation
router.get("/verticals/:regulationId", getVerticalsByRegulation);

// Get vertical courses
router.get("/vertical-courses/:verticalId/:semesterNumber", getVerticalCourses);

// In your routes file


router.post("/timetable/allocate", allocateTimetableSlot);

// router.get("/elective-buckets/:semesterId", getElectiveBucketsBySemester);
// router.get("/bucket-courses/:bucketId", getCoursesInBucket);

export default router;
