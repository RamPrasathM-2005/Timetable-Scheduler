
import { pool } from "../db.js"; // adjust path as needed

// GET regulation for a batch + department
export const getRegulationByBatchAndDept = async (req, res) => {
  const { batchId, Deptid } = req.query;

  if (!batchId || !Deptid) {
    return res.status(400).json({
      status: "error",
      message: "batchId and Deptid are required",
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT r.regulationId, r.regulationYear, r.Deptid
       FROM Batch b
       JOIN Regulation r ON b.regulationId = r.regulationId
       WHERE b.batchId = ? AND r.Deptid = ? AND r.isActive = 'YES'`,
      [batchId, Deptid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No active regulation found for this batch and department",
      });
    }

    res.json({
      status: "success",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching regulation:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
      details: error.message,
    });
  }
};

// GET all verticals for a regulation
export const getVerticalsByRegulation = async (req, res) => {
  const { regulationId } = req.params;

  if (!regulationId) {
    return res.status(400).json({
      status: "error",
      message: "regulationId is required",
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT verticalId, verticalName 
       FROM Vertical 
       WHERE regulationId = ? AND isActive = 'YES'
       ORDER BY verticalName`,
      [regulationId]
    );

    res.json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching verticals:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch verticals",
    });
  }
};

// GET vertical courses for a vertical + semester number
export const getVerticalCourses = async (req, res) => {
  const { verticalId, semesterNumber } = req.params;

  if (!verticalId || !semesterNumber) {
    return res.status(400).json({
      status: "error",
      message: "verticalId and semesterNumber are required",
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT 
         rc.regCourseId,
         rc.courseCode,
         rc.courseTitle,
         rc.credits,
         rc.category,
         rc.type
       FROM VerticalCourse vc
       JOIN RegulationCourse rc ON vc.regCourseId = rc.regCourseId
       WHERE vc.verticalId = ? 
         AND rc.semesterNumber = ? 
         AND rc.isActive = 'YES'
       ORDER BY rc.courseCode`,
      [verticalId, semesterNumber]
    );

    res.json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching vertical courses:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch vertical courses",
    });
  }
};

export const allocateTimetableSlot = async (req, res) => {
  const {
    dayOfWeek, // e.g., "MON"
    periodNumber, // 1 to 8
    course, // single courseId (regular) — optional
    bucketId, // optional: allocate all courses in bucket
    semesterId,
    Deptid,
  } = req.body;

  // Validation
  if (!dayOfWeek || !periodNumber || !semesterId || !Deptid) {
    return res.status(400).json({
      status: "error",
      message: "dayOfWeek, periodNumber, semesterId, and Deptid are required",
    });
  }

  const validDays = ["MON", "TUE", "WED", "THU", "FRI"];
  if (!validDays.includes(dayOfWeek.toUpperCase())) {
    return res.status(400).json({
      status: "error",
      message: `Invalid dayOfWeek. Must be one of: ${validDays.join(", ")}`,
    });
  }

  if (
    !Number.isInteger(Number(periodNumber)) ||
    periodNumber < 1 ||
    periodNumber > 8
  ) {
    return res.status(400).json({
      status: "error",
      message: "periodNumber must be an integer between 1 and 8",
    });
  }

  try {
    // Clear existing entries for this day + period
    await pool.execute(
      `DELETE FROM Timetable 
       WHERE semesterId = ? 
         AND Deptid = ? 
         AND dayOfWeek = ? 
         AND periodNumber = ?`,
      [semesterId, Deptid, dayOfWeek.toUpperCase(), periodNumber]
    );

    const insertions = [];

    // CASE 1: Bucket allocation — insert ALL courses from bucket
    if (bucketId) {
      const [bucketCourses] = await pool.execute(
        `SELECT c.courseId
         FROM ElectiveBucketCourse ebc
         JOIN Course c ON ebc.courseId = c.courseId
         WHERE ebc.bucketId = ?
         ORDER BY c.courseCode`,
        [bucketId]
      );

      if (bucketCourses.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "This bucket has no courses",
        });
      }

      bucketCourses.forEach((c) => {
        insertions.push([
          semesterId,
          c.courseId, // courseId
          null, // sectionId (NULL)
          dayOfWeek.toUpperCase(),
          periodNumber,
          Deptid,
        ]);
      });
    }
    // CASE 2: Single regular course
    else if (course !== undefined && course !== null && course !== "") {
      const [courseRow] = await pool.execute(
        `SELECT courseId FROM Course WHERE courseId = ?
         UNION
         SELECT regCourseId AS courseId FROM RegulationCourse WHERE regCourseId = ?`,
        [course, course]
      );

      if (courseRow.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Course not found",
        });
      }

      insertions.push([
        semesterId,
        courseRow[0].courseId,
        null, // sectionId
        dayOfWeek.toUpperCase(),
        periodNumber,
        Deptid,
      ]);
    }
    // CASE 3: Free period — insert one row with courseId = NULL
    else {
      insertions.push([
        semesterId,
        null, // courseId = NULL → free period
        null, // sectionId
        dayOfWeek.toUpperCase(),
        periodNumber,
        Deptid,
      ]);
    }

    // Bulk insert — only if there are rows
    if (insertions.length > 0) {
      await pool.query(
        `INSERT INTO Timetable 
         (semesterId, courseId, sectionId, dayOfWeek, periodNumber, Deptid)
         VALUES ?`,
        [insertions]
      );
    }

    res.json({
      status: "success",
      message: `Successfully allocated ${insertions.length} course(s) to ${dayOfWeek} Period ${periodNumber}`,
      allocatedCourses: insertions.length,
    });
  } catch (error) {
    console.error("Allocate timetable error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to allocate slot",
      details: error.message,
    });
  }
};