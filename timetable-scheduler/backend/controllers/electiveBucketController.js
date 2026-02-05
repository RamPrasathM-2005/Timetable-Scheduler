import express from "express";
import pool from "../db.js";
import catchAsync from "../utils/catchAsync.js";

const router = express.Router();

export const getElectiveBuckets = catchAsync(async (req, res) => {
  const { semesterId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [buckets] = await connection.execute(
      `SELECT bucketId, bucketNumber, bucketName 
       FROM ElectiveBucket 
       WHERE semesterId = ?`,
      [semesterId]
    );
    for (let bucket of buckets) {
      const [courses] = await connection.execute(
      `SELECT 
        c.courseCode, 
        c.courseTitle, 
        vc.verticalId, 
        v.verticalName
      FROM ElectiveBucketCourse ebc 
      JOIN Course c ON ebc.courseId = c.courseId 
      JOIN Semester s ON c.semesterId = s.semesterId
      JOIN Batch b ON s.batchId = b.batchId
      LEFT JOIN RegulationCourse rc 
        ON rc.courseCode = c.courseCode 
        AND rc.semesterNumber = s.semesterNumber 
        AND rc.regulationId = b.regulationId
      LEFT JOIN VerticalCourse vc ON rc.regCourseId = vc.regCourseId
      LEFT JOIN Vertical v ON vc.verticalId = v.verticalId
      WHERE ebc.bucketId = ? AND c.isActive = 'YES'`,
      [bucket.bucketId]
    );
      bucket.courses = courses;
    }
    res.status(200).json({ status: "success", data: buckets });
  } finally {
    connection.release();
  }
});

export const createElectiveBucket = catchAsync(async (req, res) => {
  const { semesterId } = req.params;
  const connection = await pool.getConnection();
  try {
    // 1. Verify semester exists (Optional but safer)
    const [semExists] = await connection.execute(
      "SELECT semesterId FROM Semester WHERE semesterId = ?",
      [semesterId]
    );
    if (semExists.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Semester not found" });
    }

    // 2. Auto-increment bucket number for THIS semester
    const [maxRow] = await connection.execute(
      `SELECT COALESCE(MAX(bucketNumber), 0) as maxNum FROM ElectiveBucket WHERE semesterId = ?`,
      [semesterId]
    );
    const bucketNumber = maxRow[0].maxNum + 1;

    const [result] = await connection.execute(
      `INSERT INTO ElectiveBucket (semesterId, bucketNumber, bucketName, createdBy) 
       VALUES (?, ?, ?, ?)`,
      [
        semesterId,
        bucketNumber,
        `Elective Bucket ${bucketNumber}`,
        req.user.Userid,
      ]
    );

    res.status(201).json({
      status: "success",
      bucketId: result.insertId,
      bucketNumber,
    });
  } finally {
    connection.release();
  }
});

export const updateElectiveBucketName = catchAsync(async (req, res) => {
  const { bucketId } = req.params;
  const { bucketName } = req.body;
  if (!bucketName || !bucketName.trim()) {
    return res
      .status(400)
      .json({ status: "failure", message: "Bucket name cannot be empty" });
  }
  const connection = await pool.getConnection();
  try {
    const [bucket] = await connection.execute(
      `SELECT bucketId FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );
    if (bucket.length === 0) {
      return res
        .status(404)
        .json({
          status: "failure",
          message: `Bucket with ID ${bucketId} not found`,
        });
    }
    const [result] = await connection.execute(
      `UPDATE ElectiveBucket SET bucketName = ?, updatedAt = CURRENT_TIMESTAMP WHERE bucketId = ?`,
      [bucketName.trim(), bucketId]
    );
    if (result.affectedRows === 0) {
      return res
        .status(500)
        .json({
          status: "failure",
          message: `Failed to update bucket ${bucketId}`,
        });
    }
    res
      .status(200)
      .json({
        status: "success",
        message: `Bucket ${bucketId} name updated successfully`,
      });
  } catch (err) {
    console.error("Error updating bucket name:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
      sqlMessage: err.sqlMessage || "No SQL message available",
    });
  } finally {
    connection.release();
  }
});

export const addCoursesToBucket = catchAsync(async (req, res) => {
  const { bucketId } = req.params;
  const { courseCodes } = req.body;

  if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
    return res.status(400).json({
      status: "failure",
      message: "courseCodes must be a non-empty array",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Validate bucket existence and get its semesterId
    const [bucket] = await connection.execute(
      `SELECT semesterId FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );

    if (bucket.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: "failure",
        message: `Bucket with ID ${bucketId} not found`,
      });
    }

    const bucketSemesterId = bucket[0].semesterId;
    const errors = [];
    const addedCourses = [];

    for (let courseCode of courseCodes) {
      // 2. Validate course existence WITHIN the bucket's specific semester/department
      // This is the key change: we filter by both courseCode AND bucketSemesterId
      const [course] = await connection.execute(
        `SELECT courseId FROM Course 
         WHERE courseCode = ? 
         AND semesterId = ? 
         AND category IN ('PEC', 'OEC') 
         AND isActive = 'YES'`,
        [courseCode, bucketSemesterId]
      );

      if (course.length === 0) {
        errors.push(
          `Course ${courseCode} is not available in the curriculum for this specific department/semester.`
        );
        continue;
      }

      const courseId = course[0].courseId;

      // 3. Check if this course (by code) is already in another bucket FOR THIS SEMESTER
      const [existingInOtherBucket] = await connection.execute(
        `SELECT ebc.bucketId 
         FROM ElectiveBucketCourse ebc 
         JOIN Course c ON ebc.courseId = c.courseId 
         WHERE c.courseCode = ? 
         AND c.semesterId = ? 
         AND ebc.bucketId != ?`,
        [courseCode, bucketSemesterId, bucketId]
      );

      if (existingInOtherBucket.length > 0) {
        errors.push(
          `Course ${courseCode} is already assigned to another bucket (ID: ${existingInOtherBucket[0].bucketId}) in this department.`
        );
        continue;
      }

      // 4. Check if this course is already in THIS current bucket
      const [alreadyInThisBucket] = await connection.execute(
        `SELECT id FROM ElectiveBucketCourse 
         WHERE bucketId = ? AND courseId = ?`,
        [bucketId, courseId]
      );

      if (alreadyInThisBucket.length > 0) {
        // Just skip if it's already there, no need to throw an error unless preferred
        continue;
      }

      // 5. Insert course into bucket
      const [result] = await connection.execute(
        `INSERT INTO ElectiveBucketCourse (bucketId, courseId) VALUES (?, ?)`,
        [bucketId, courseId]
      );

      if (result.affectedRows > 0) {
        addedCourses.push(courseCode);
      }
    }

    // If no courses were added and there were errors, return failure
    if (addedCourses.length === 0 && errors.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        status: "failure",
        message: "Failed to add courses to bucket",
        errors,
      });
    }

    await connection.commit();
    res.status(200).json({
      status: "success",
      message: `Successfully processed courses for bucket`,
      addedCount: addedCourses.length,
      addedCourses,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error adding courses to bucket:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

export const removeCourseFromBucket = catchAsync(async (req, res) => {
  const { bucketId, courseCode } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Validate bucket existence
    const [bucket] = await connection.execute(
      `SELECT bucketId FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );
    if (bucket.length === 0) {
      return res
        .status(404)
        .json({
          status: "failure",
          message: `Bucket with ID ${bucketId} not found`,
        });
    }

    // Get courseId from courseCode
    const [courses] = await connection.execute(
      `SELECT courseId FROM Course WHERE courseCode = ?`,
      [courseCode]
    );
    if (courses.length === 0) {
      return res
        .status(404)
        .json({ status: "failure", message: `Course ${courseCode} not found` });
    }
    const courseId = courses[0].courseId;

    // Check if course exists in the bucket
    const [existing] = await connection.execute(
      `SELECT id FROM ElectiveBucketCourse WHERE bucketId = ? AND courseId = ?`,
      [bucketId, courseId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({
          status: "failure",
          message: `Course ${courseCode} not found in bucket ${bucketId}`,
        });
    }

    // Remove course from bucket
    const [result] = await connection.execute(
      `DELETE FROM ElectiveBucketCourse WHERE bucketId = ? AND courseId = ?`,
      [bucketId, courseId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res
        .status(500)
        .json({
          status: "failure",
          message: `Failed to remove course ${courseCode} from bucket ${bucketId}`,
        });
    }

    await connection.commit();
    res.status(200).json({
      status: "success",
      message: `Course ${courseCode} removed from bucket ${bucketId} successfully`,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error removing course from bucket:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
      sqlMessage: err.sqlMessage || "No SQL message available",
    });
  } finally {
    connection.release();
  }
});

export const deleteElectiveBucket = catchAsync(async (req, res) => {
  const { bucketId } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Delete associated courses first
    await connection.execute(
      `DELETE FROM ElectiveBucketCourse WHERE bucketId = ?`,
      [bucketId]
    );
    // Delete the bucket
    const [result] = await connection.execute(
      `DELETE FROM ElectiveBucket WHERE bucketId = ?`,
      [bucketId]
    );
    if (result.affectedRows === 0) {
      throw new Error(`Bucket with ID ${bucketId} not found`);
    }
    await connection.commit();
    res
      .status(200)
      .json({ status: "success", message: "Bucket deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting bucket:", err);
    res.status(500).json({
      status: "failure",
      message: `Server error: ${err.message}`,
      sqlMessage: err.sqlMessage || "No SQL message available",
    });
  } finally {
    connection.release();
  }
});
