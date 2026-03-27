import pool from '../db.js';
import catchAsync from '../utils/catchAsync.js';

export const getAllTimetableDepartments = catchAsync(async (req, res) => {
  const userEmail = req.user?.email || 'admin';
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user
    const [userCheck] = await connection.execute(
      'SELECT Userid FROM users WHERE Email = ? AND status = "active"',
      [userEmail]
    );
    if (userCheck.length === 0) {
      return res.status(400).json({
        status: 'failure',
        message: `No active user found with email ${userEmail}`,
        data: [],
      });
    }

    const [rows] = await connection.execute(
      'SELECT Deptid, Deptacronym AS deptCode, Deptname FROM department'
    );

    await connection.commit();
    res.status(200).json({
      status: 'success',
      data: rows || [],
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error fetching timetable departments:', error);
    res.status(500).json({
      status: 'failure',
      message: 'Failed to fetch departments for timetable: ' + error.message,
      data: [],
    });
  } finally {
    if (connection) connection.release();
  }
});

export const getAllTimetableBatches = catchAsync(async (req, res) => {
  const userEmail = req.user?.email || 'admin';
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user
    const [userCheck] = await connection.execute(
      'SELECT Userid FROM users WHERE Email = ? AND status = "active"',
      [userEmail]
    );
    if (userCheck.length === 0) {
      return res.status(400).json({
        status: 'failure',
        message: `No active user found with email ${userEmail}`,
        data: [],
      });
    }

    const [rows] = await connection.execute(
      'SELECT batchId, degree, branch, batch, batchYears FROM Batch WHERE isActive = "YES"'
    );

    await connection.commit();
    res.status(200).json({
      status: 'success',
      data: rows || [],
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error fetching timetable batches:', error);
    res.status(500).json({
      status: 'failure',
      message: 'Failed to fetch batches for timetable: ' + error.message,
      data: [],
    });
  } finally {
    if (connection) connection.release();
  }
});

export const getTimetable = catchAsync(async (req, res) => {
  const { semesterId } = req.params;
  const userEmail = req.user?.email || 'admin';
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user
    const [userCheck] = await connection.execute(
      'SELECT Userid FROM users WHERE Email = ? AND status = "active"',
      [userEmail]
    );
    if (userCheck.length === 0) {
      throw new Error(`No active user found with email ${userEmail}`);
    }

    // Validate semesterId
    if (isNaN(semesterId) || semesterId <= 0) {
      throw new Error('Invalid semesterId: must be a positive number');
    }

    const [semesterRows] = await connection.execute(
      'SELECT semesterId FROM Semester WHERE semesterId = ? AND isActive = "YES"',
      [semesterId]
    );
    if (semesterRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No active semester found with semesterId ${semesterId}`,
        data: [],
      });
    }

    const [rows] = await connection.execute(
      `
      SELECT t.timetableId, c.courseId, 
             COALESCE(t.sectionId, 0) AS sectionId, 
             UPPER(COALESCE(t.dayOfWeek, '')) AS dayOfWeek, 
             t.periodNumber, 
             COALESCE(c.courseTitle, c.courseId) AS courseTitle, 
             COALESCE(s.sectionName, 'No Section') AS sectionName
      FROM Timetable t
      LEFT JOIN Course c ON t.courseId = c.courseId AND c.isActive = "YES"
      LEFT JOIN Section s ON t.sectionId = s.sectionId AND (s.isActive = "YES" OR s.isActive IS NULL)
      WHERE t.semesterId = ? 
        AND t.isActive = "YES" 
        AND (t.dayOfWeek IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT') OR t.dayOfWeek IS NULL)
        AND (t.periodNumber BETWEEN 1 AND 8 OR t.periodNumber IS NULL)
      `,
      [semesterId]
    );

    // Log warnings for invalid entries
    rows.forEach((entry, index) => {
      if (!entry.dayOfWeek || entry.periodNumber === null) {
        console.warn(`Invalid timetable entry at index ${index} for semesterId ${semesterId}:`, entry);
      }
    });

    await connection.commit();
    res.status(200).json({
      status: 'success',
      data: rows || [],
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error fetching timetable:', error);
    res.status(error.message.includes('No active user') || error.message.includes('Invalid semesterId') ? 400 : 500).json({
      status: 'failure',
      message: `Failed to fetch timetable: ${error.message}`,
      data: [],
    });
  } finally {
    if (connection) connection.release();
  }
});

export const getTimetableByFilters = catchAsync(async (req, res) => {
  const { degree, Deptid, semesterNumber } = req.query;
  const userEmail = req.user?.email || 'admin';
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user
    const [userCheck] = await connection.execute(
      'SELECT Userid FROM users WHERE Email = ? AND status = "active"',
      [userEmail]
    );
    if (userCheck.length === 0) {
      throw new Error(`No active user found with email ${userEmail}`);
    }

    // Validate required fields
    if (!degree || !Deptid || !semesterNumber) {
      throw new Error('degree, Deptid, and semesterNumber are required');
    }
    if (isNaN(Deptid) || Deptid <= 0) throw new Error('Invalid Deptid: must be a positive number');
    if (isNaN(semesterNumber) || semesterNumber <= 0) throw new Error('Invalid semesterNumber: must be a positive number');
    const validSemesters = [1, 2, 3, 4, 5, 6, 7, 8];
    if (!validSemesters.includes(Number(semesterNumber))) {
      throw new Error(`Invalid semesterNumber: must be one of ${validSemesters.join(', ')}`);
    }

    const [deptRows] = await connection.execute(
      'SELECT Deptid FROM department WHERE Deptid = ?',
      [Deptid]
    );
    if (deptRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No department found with Deptid ${Deptid}`,
        data: [],
      });
    }

    const [rows] = await connection.execute(
      `
      SELECT t.timetableId, c.courseId, 
             COALESCE(t.sectionId, 0) AS sectionId, 
             UPPER(COALESCE(t.dayOfWeek, '')) AS dayOfWeek, 
             t.periodNumber, 
             COALESCE(c.courseTitle, c.courseId) AS courseTitle, 
             COALESCE(s.sectionName, 'No Section') AS sectionName
      FROM Timetable t
      LEFT JOIN Course c ON t.courseId = c.courseId AND c.isActive = "YES"
      LEFT JOIN Section s ON t.sectionId = s.sectionId AND (s.isActive = "YES" OR s.isActive IS NULL)
      JOIN Semester sem ON t.semesterId = sem.semesterId
      JOIN Batch b ON sem.batchId = b.batchId
      WHERE b.degree = ? AND t.Deptid = ? AND sem.semesterNumber = ? 
        AND t.isActive = "YES" 
        AND b.isActive = "YES"
        AND (t.dayOfWeek IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT') OR t.dayOfWeek IS NULL)
        AND (t.periodNumber BETWEEN 1 AND 8 OR t.periodNumber IS NULL)
      `,
      [degree, Deptid, semesterNumber]
    );

    // Log warnings for invalid entries
    rows.forEach((entry, index) => {
      if (!entry.dayOfWeek || entry.periodNumber === null) {
        console.warn(`Invalid timetable entry at index ${index} for degree ${degree}, Deptid ${Deptid}, semesterNumber ${semesterNumber}:`, entry);
      }
    });

    await connection.commit();
    res.status(200).json({
      status: 'success',
      data: rows || [],
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error fetching timetable by filters:', error);
    res.status(error.message.includes('No active user') || error.message.includes('Invalid') || error.message.includes('No department') ? 400 : 500).json({
      status: 'failure',
      message: `Failed to fetch timetable by filters: ${error.message}`,
      data: [],
    });
  } finally {
    if (connection) connection.release();
  }
});

export const createTimetableEntry = catchAsync(async (req, res) => {
  const { courseId, courseTitle, sectionId, dayOfWeek, periodNumber, Deptid, semesterId } = req.body;
  const userEmail = req.user?.email || 'admin';
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user
    const [userCheck] = await connection.execute(
      'SELECT Userid FROM users WHERE Email = ? AND status = "active"',
      [userEmail]
    );
    if (userCheck.length === 0) {
      throw new Error(`No active user found with email ${userEmail}`);
    }

    // Validate required fields
    if (!courseId || !dayOfWeek || !periodNumber || !Deptid || !semesterId) {
      throw new Error('courseId, dayOfWeek, periodNumber, Deptid, and semesterId are required');
    }

    // Validate numeric fields
    if (isNaN(Deptid) || Deptid <= 0) throw new Error('Invalid Deptid: must be a positive number');
    if (isNaN(semesterId) || semesterId <= 0) throw new Error('Invalid semesterId: must be a positive number');
    if (isNaN(periodNumber) || periodNumber <= 0) throw new Error('Invalid periodNumber: must be a positive number');

    // Validate dayOfWeek and periodNumber
    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    if (!validDays.includes(dayOfWeek)) {
      throw new Error(`Invalid dayOfWeek: must be one of ${validDays.join(', ')}`);
    }
    const validTeachingPeriods = [1, 2, 3, 4, 5, 6, 7, 8];
    if (!validTeachingPeriods.includes(Number(periodNumber))) {
      throw new Error('Invalid period number: must be a valid teaching period (1-8)');
    }

    // Validate semesterId
    const [semesterRows] = await connection.execute(
      'SELECT semesterId FROM Semester WHERE semesterId = ? AND isActive = "YES"',
      [semesterId]
    );
    if (semesterRows.length === 0) {
      throw new Error(`No active semester found with semesterId ${semesterId}`);
    }

    // Validate Deptid
    const [deptRows] = await connection.execute(
      'SELECT Deptid FROM Department WHERE Deptid = ?',
      [Deptid]
    );
    if (deptRows.length === 0) {
      throw new Error(`No department found with Deptid ${Deptid}`);
    }

    // Check for conflicts
    const [conflictCheck] = await connection.execute(
      'SELECT timetableId FROM Timetable WHERE semesterId = ? AND dayOfWeek = ? AND periodNumber = ? AND isActive = "YES"',
      [semesterId, dayOfWeek, periodNumber]
    );
    if (conflictCheck.length > 0) {
      throw new Error('Time slot already assigned');
    }

    // Validate courseId and courseTitle
    let finalCourseTitle = courseTitle;
    const [courseRows] = await connection.execute(
      'SELECT courseId, courseTitle FROM Course WHERE courseId = ? AND isActive = "YES"',
      [courseId]
    );
    if (courseRows.length > 0) {
      finalCourseTitle = courseRows[0].courseTitle; // Use actual courseTitle for valid courses
    } else if (!courseTitle) {
      throw new Error(`No active course found with courseId ${courseId} and no courseTitle provided`);
    }

    // Validate sectionId if provided
    if (sectionId) {
      const [sectionCheck] = await connection.execute(
        'SELECT sectionId FROM Section WHERE sectionId = ? AND courseId = ? AND isActive = "YES"',
        [sectionId, courseId]
      );
      if (sectionCheck.length === 0) {
        throw new Error(`No active section found with sectionId ${sectionId} for courseId ${courseId}`);
      }
    }

    const [result] = await connection.execute(
      `
      INSERT INTO Timetable (courseId, sectionId, dayOfWeek, periodNumber, Deptid, semesterId, isActive, createdBy, updatedBy)
      VALUES (?, ?, ?, ?, ?, ?, 'YES', ?, ?)
      `,
      [courseId, sectionId || null, dayOfWeek, periodNumber, Deptid, semesterId, userEmail, userEmail]
    );

    await connection.commit();
    res.status(201).json({
      status: 'success',
      timetableId: result.insertId,
      message: 'Timetable entry created successfully',
      data: {
        timetableId: result.insertId,
        courseId: courseRows.length > 0 ? courseRows[0].courseId : courseId,
        courseTitle: finalCourseTitle,
        sectionId: sectionId || null,
        dayOfWeek,
        periodNumber,
        Deptid,
        semesterId,
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error creating timetable entry:', error);
    res.status(error.message.includes('No active user') || error.message.includes('Invalid') || error.message.includes('No active') || error.message.includes('Time slot') || error.message.includes('No department') ? 400 : 500).json({
      status: 'failure',
      message: `Failed to create timetable entry: ${error.message}`,
    });
  } finally {
    if (connection) connection.release();
  }
});

export const updateTimetableEntry = catchAsync(async (req, res) => {
  const { timetableId } = req.params;
  const { courseId, sectionId, dayOfWeek, periodNumber, Deptid, semesterId } = req.body;
  const userEmail = req.user?.email || 'admin';
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user
    const [userCheck] = await connection.execute(
      'SELECT Userid FROM users WHERE Email = ? AND status = "active"',
      [userEmail]
    );
    if (userCheck.length === 0) {
      return res.status(400).json({
        status: 'failure',
        message: `No active user found with email ${userEmail}`,
      });
    }

    // Validate required fields
    if (!courseId || !dayOfWeek || !periodNumber || !Deptid || !semesterId) {
      return res.status(400).json({
        status: 'failure',
        message: 'courseId, dayOfWeek, periodNumber, Deptid, and semesterId are required',
      });
    }

    // Validate timetableId
    const [timetableRows] = await connection.execute(
      'SELECT timetableId FROM Timetable WHERE timetableId = ? AND isActive = "YES"',
      [timetableId]
    );
    if (timetableRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No active timetable entry found with timetableId ${timetableId}`,
      });
    }

    // Validate courseId
    const [courseRows] = await connection.execute(
      'SELECT courseId FROM Course WHERE courseId = ? AND isActive = "YES"',
      [courseId]
    );
    if (courseRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No active course found with courseId ${courseId}`,
      });
    }

    // Validate semesterId
    const [semesterRows] = await connection.execute(
      'SELECT semesterId FROM Semester WHERE semesterId = ? AND isActive = "YES"',
      [semesterId]
    );
    if (semesterRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No active semester found with semesterId ${semesterId}`,
      });
    }

    // Validate Deptid
    const [deptRows] = await connection.execute(
      'SELECT Deptid FROM Department WHERE Deptid = ?',
      [Deptid]
    );
    if (deptRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No department found with Deptid ${Deptid}`,
      });
    }

    // Validate periodNumber
    const validTeachingPeriods = [1, 2, 3, 4, 5, 6, 7, 8];
    if (!validTeachingPeriods.includes(Number(periodNumber))) {
      return res.status(400).json({
        status: 'failure',
        message: 'Invalid period number: must be a valid teaching period (1-8)',
      });
    }

    // Check for conflicts
    const [conflictCheck] = await connection.execute(
      'SELECT timetableId FROM Timetable WHERE semesterId = ? AND dayOfWeek = ? AND periodNumber = ? AND timetableId != ? AND isActive = "YES"',
      [semesterId, dayOfWeek, periodNumber, timetableId]
    );
    if (conflictCheck.length > 0) {
      return res.status(400).json({
        status: 'failure',
        message: 'Time slot already assigned',
      });
    }

    // Validate sectionId if provided
    if (sectionId) {
      const [sectionCheck] = await connection.execute(
        'SELECT sectionId FROM Section WHERE sectionId = ? AND courseId = ? AND isActive = "YES"',
        [sectionId, courseId]
      );
      if (sectionCheck.length === 0) {
        return res.status(404).json({
          status: 'failure',
          message: `No active section found with sectionId ${sectionId} for courseId ${courseId}`,
        });
      }
    }

    const [result] = await connection.execute(
      `
      UPDATE Timetable
      SET courseId = ?, sectionId = ?, dayOfWeek = ?, periodNumber = ?, Deptid = ?, semesterId = ?, updatedBy = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE timetableId = ?
      `,
      [courseId, sectionId || null, dayOfWeek, periodNumber, Deptid, semesterId, userEmail, timetableId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'failure',
        message: 'Timetable entry not found',
      });
    }

    await connection.commit();
    res.status(200).json({
      status: 'success',
      message: 'Timetable entry updated',
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating timetable entry:', error);
    res.status(error.message.includes('No active user') || error.message.includes('Invalid') || error.message.includes('No active') || error.message.includes('Time slot') || error.message.includes('No department') ? 400 : 500).json({
      status: 'failure',
      message: 'Failed to update timetable entry: ' + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

export const deleteTimetableEntry = catchAsync(async (req, res) => {
  const { timetableId } = req.params;
  const userEmail = req.user?.email || 'admin';
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Validate user
    const [userCheck] = await connection.execute(
      'SELECT Userid FROM users WHERE Email = ? AND status = "active"',
      [userEmail]
    );
    if (userCheck.length === 0) {
      return res.status(400).json({
        status: 'failure',
        message: `No active user found with email ${userEmail}`,
      });
    }

    // Validate timetableId
    const [timetableRows] = await connection.execute(
      'SELECT timetableId FROM Timetable WHERE timetableId = ? AND isActive = "YES"',
      [timetableId]
    );
    if (timetableRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No active timetable entry found with timetableId ${timetableId}`,
      });
    }

    // Soft delete
    const [result] = await connection.execute(
      'UPDATE Timetable SET isActive = "NO", updatedBy = ?, updatedDate = CURRENT_TIMESTAMP WHERE timetableId = ?',
      [userEmail, timetableId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'failure',
        message: 'Timetable entry not found',
      });
    }

    await connection.commit();
    res.status(200).json({
      status: 'success',
      message: 'Timetable entry deleted',
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting timetable entry:', error);
    res.status(500).json({
      status: 'failure',
      message: 'Failed to delete timetable entry: ' + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==================== ELECTIVE BUCKETS ====================

// GET all buckets for a semester
export const getElectiveBucketsBySemester = async (req, res) => {
  const { semesterId } = req.params;

  try {
    const [buckets] = await pool.execute(
      `SELECT 
         bucketId,
         bucketNumber,
         bucketName,
         semesterId
       FROM ElectiveBucket 
       WHERE semesterId = ? 
       ORDER BY bucketNumber`,
      [semesterId]
    );

    res.json({
      status: "success",
      data: buckets,
    });
  } catch (error) {
    console.error("Error fetching elective buckets:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch elective buckets",
    });
  }
};

export const getCoursesInBucket = async (req, res) => {
  const { bucketId } = req.params;

  try {
    const [courses] = await pool.execute(
      `SELECT 
         c.courseId,
         c.courseCode,
         c.courseTitle,
         c.credits
       FROM ElectiveBucketCourse ebc
       JOIN Course c ON ebc.courseId = c.courseId
       WHERE ebc.bucketId = ?
       ORDER BY c.courseCode`,
      [bucketId]
    );

    res.json({
      status: "success",
      data: courses,
    });
  } catch (error) {
    console.error("Error fetching bucket courses:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch courses for this bucket",
    });
  }
};





// Add these to your TimetableController.js

// 1. Get Timetable specifically for a Lab Room
export const getLabTimetable = async (req, res) => {
  const { labId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT t.*, c.courseCode, c.courseTitle, s.semesterNumber, 
              sec.sectionName, d.Deptacronym, u.username as staffName
       FROM Timetable t
       JOIN Course c ON t.courseId = c.courseId
       JOIN Semester s ON t.semesterId = s.semesterId
       JOIN department d ON t.Deptid = d.Deptid
       LEFT JOIN Section sec ON t.sectionId = sec.sectionId
       LEFT JOIN users u ON t.createdBy = u.email -- or join with StaffCourse for actual staff
       WHERE t.labId = ? AND t.isActive = 'YES'`,
      [labId]
    );
    res.status(200).json({ data: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Multi-Lab Allocation (The "3 Batches -> 3 Labs" Logic)
export const allocateMultiLabSession = async (req, res) => {
  const { allocations, day, period, semesterId, courseId, deptId } = req.body;
  // allocations structure: [{ labId: 1, sectionId: 5 }, { labId: 2, sectionId: 6 }]
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Loop through each allocation request
    for (const alloc of allocations) {
      // A. Check if Lab is free
      const [conflict] = await connection.execute(
        `SELECT * FROM Timetable 
         WHERE dayOfWeek = ? AND periodNumber = ? AND labId = ? AND isActive = 'YES'`,
        [day, period, alloc.labId]
      );

      if (conflict.length > 0) {
        throw new Error(`Lab ID ${alloc.labId} is already occupied.`);
      }

      // B. Insert Allocation
      await connection.execute(
        `INSERT INTO Timetable 
        (semesterId, Deptid, dayOfWeek, periodNumber, courseId, sectionId, labId, isActive, createdBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'YES', ?)`,
        [semesterId, deptId, day, period, courseId, alloc.sectionId || null, alloc.labId, req.user?.email || 'admin']
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Multi-Lab Allocation Successful" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(400).json({ message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// 3. Get Sections for a Course (Helper for frontend)
export const getCourseSections = async (req, res) => {
    const { courseId } = req.params;
    try {
        const [sections] = await pool.execute(
            `SELECT * FROM Section WHERE courseId = ? AND isActive = 'YES'`, 
            [courseId]
        );
        res.status(200).json({ data: sections });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};







export const allocateLabSession = async (req, res) => {
  const { semesterId, deptId, courseId, sectionId, labId, day, period } = req.body;
  const createdBy = req.user?.email || 'admin'; 

  // Basic Validation
  if (!semesterId || !deptId || !courseId || !labId || !day || !period) {
    return res.status(400).json({ message: "Missing required fields (semester, course, lab, day, period)" });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. PHYSICAL LAB ROOM CONFLICT CHECK
    // Check if this physical Lab Room is already booked for this specific Day & Period
    const [labConflict] = await connection.execute(
      `SELECT t.timetableId, c.courseCode, s.semesterNumber 
       FROM Timetable t
       JOIN Course c ON t.courseId = c.courseId
       JOIN Semester s ON t.semesterId = s.semesterId
       WHERE t.dayOfWeek = ? 
         AND t.periodNumber = ? 
         AND t.labId = ? 
         AND t.isActive = 'YES'`,
      [day, period, labId]
    );

    if (labConflict.length > 0) {
      throw new Error(`Conflict: Lab room is already occupied by ${labConflict[0].courseCode} (Sem ${labConflict[0].semesterNumber})`);
    }

    // 2. STUDENT/SECTION CONFLICT CHECK
    // Remove existing class for this specific Section (or whole semester if no section defined) at this time.
    let deleteQuery = `DELETE FROM Timetable WHERE semesterId = ? AND dayOfWeek = ? AND periodNumber = ?`;
    let deleteParams = [semesterId, day, period];

    if (sectionId) {
      deleteQuery += ` AND (sectionId = ? OR sectionId IS NULL)`; // Overwrite section-specific or common classes
      deleteParams.push(sectionId);
    } 
    // If no sectionId is provided, it assumes a common class and overwrites everything for that Sem/Day/Period (Original logic)

    await connection.execute(deleteQuery, deleteParams);

    // 3. INSERT ALLOCATION
    const [result] = await connection.execute(
      `INSERT INTO Timetable 
       (semesterId, Deptid, dayOfWeek, periodNumber, courseId, sectionId, labId, isActive, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'YES', ?)`,
      [semesterId, deptId, day, period, courseId, sectionId || null, labId, createdBy]
    );

    await connection.commit();
    
    res.status(201).json({ 
      message: "Lab Session Allocated Successfully", 
      timetableId: result.insertId 
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lab Allocation Error:", error);
    res.status(500).json({ message: error.message || "Failed to allocate lab session" });
  } finally {
    if (connection) connection.release();
  }
};



const normalizeSeed = (seedInput) => {
  if (seedInput === null || seedInput === undefined || seedInput === '') return `${Date.now()}`;
  return String(seedInput);
};

const createSeededRandom = (seedInput) => {
  const seed = normalizeSeed(seedInput);
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const rng = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { rng, seedUsed: seed };
};

const shuffle = (array, rng = Math.random) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const clampInt = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

export const autoGenerateTimetable = async (req, res) => {
  const { semesterId } = req.params;
  const userEmail = req.user?.email || 'admin';
  const requestedMode = String(req.body?.mode || req.query?.mode || 'heuristic').toLowerCase();
  const seedInput = req.body?.seed ?? req.query?.seed ?? null;
  const backtrackDepth = clampInt(req.body?.backtrackDepth ?? req.query?.backtrackDepth, 1, 15, 3);
  const maxBacktrackAttempts = clampInt(req.body?.maxBacktrackAttempts ?? req.query?.maxBacktrackAttempts, 0, 200, 30);
  const exactMaxNodes = clampInt(req.body?.exactMaxNodes ?? req.query?.exactMaxNodes, 1000, 250000, 30000);
  const exactTimeLimitMs = clampInt(req.body?.exactTimeLimitMs ?? req.query?.exactTimeLimitMs, 500, 30000, 8000);
  const validModes = new Set(['heuristic', 'scored', 'exact']);
  const mode = validModes.has(requestedMode) ? requestedMode : 'heuristic';

  const { rng, seedUsed } = createSeededRandom(seedInput);
  const generationStartedAt = Date.now();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [semDetails] = await connection.execute(
      `SELECT s.semesterNumber, d.Deptid
       FROM Semester s
       JOIN Batch b ON s.batchId = b.batchId
       JOIN department d ON b.branch = d.Deptacronym
       WHERE s.semesterId = ?`,
      [semesterId]
    );

    if (!semDetails.length) throw new Error('Semester details not found.');
    const { Deptid } = semDetails[0];

    const [coursesRaw] = await connection.execute(
      `SELECT
         c.courseId, c.courseCode, c.courseTitle, c.credits,
         c.lectureHours, c.tutorialHours, c.practicalHours, c.experientialHours,
         (SELECT sc.Userid FROM StaffCourse sc WHERE sc.courseId = c.courseId LIMIT 1) as mainStaffId
       FROM Course c
       WHERE c.semesterId = ? AND c.isActive = 'YES'`,
      [semesterId]
    );

    const courses = coursesRaw.map((c) => ({
      ...c,
      staffId: c.mainStaffId || null,
      credits: Number(c.credits || 0),
    }));

    const courseById = {};
    courses.forEach((c) => {
      courseById[c.courseId] = c;
    });

    const courseIds = courses.map((c) => c.courseId);
    const sectionMap = {};vi
    if (courseIds.length > 0) {
      const [sections] = await connection.query(
        `SELECT sectionId, courseId, sectionName FROM Section WHERE courseId IN (?) AND isActive='YES'`,
        [courseIds]
      );
      sections.forEach((s) => {
        if (!sectionMap[s.courseId]) sectionMap[s.courseId] = [];
        sectionMap[s.courseId].push(s);
      });
    }

    const [labRooms] = await connection.execute(
      `SELECT labId, labName FROM LabRooms WHERE Deptid = ? AND isActive = 'YES'`,
      [Deptid]
    );

    const staffMap = {};
    courses.forEach((c) => {
      if (c.staffId) staffMap[c.courseId] = c.staffId;
    });
    const allStaffIds = [...new Set(Object.values(staffMap))];

    const globalStaffBusy = {};
    if (allStaffIds.length > 0) {
      const [busyRows] = await connection.query(
        `SELECT t.dayOfWeek, t.periodNumber, sc.Userid as staffId
         FROM Timetable t
         JOIN StaffCourse sc ON t.courseId = sc.courseId
         WHERE sc.Userid IN (?) AND t.isActive = 'YES' AND t.semesterId != ?`,
        [allStaffIds, semesterId]
      );
      busyRows.forEach((r) => {
        if (!globalStaffBusy[r.staffId]) globalStaffBusy[r.staffId] = {};
        globalStaffBusy[r.staffId][`${r.dayOfWeek}-${r.periodNumber}`] = true;
      });
    }

    const globalLabBusy = {};
    if (labRooms.length > 0) {
      const [busyLabs] = await connection.query(
        `SELECT dayOfWeek, periodNumber, labId FROM Timetable
         WHERE labId IS NOT NULL AND isActive='YES' AND semesterId != ?`,
        [semesterId]
      );
      busyLabs.forEach((r) => {
        if (!globalLabBusy[r.labId]) globalLabBusy[r.labId] = {};
        globalLabBusy[r.labId][`${r.dayOfWeek}-${r.periodNumber}`] = true;
      });
    }

    // Preserve existing semester allocations (treated as locked/manual slots).
    const [existingSemesterRows] = await connection.execute(
      `SELECT dayOfWeek, periodNumber, courseId, sectionId, labId
       FROM Timetable
       WHERE semesterId = ? AND isActive = 'YES'`,
      [semesterId]
    );

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];
    const priorityGroups = [
      [2, 3, 4],
      [7, 8],
    ];
    const theoryPriorityPeriods = [2, 3, 4, 7, 8];
    const strictLabBlocks = [
      [5, 6],
      [7, 8],
    ];
    const dayIndex = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5 };

    const timetable = {};
    days.forEach((d) => {
      timetable[d] = {};
      periods.forEach((p) => {
        timetable[d][p] = null;
      });
    });

    const pendingTheory = {};
    const pendingLab = {};
    const dailyCourseCounts = {};
    const labDays = {};
    const integratedCourseMap = {};
    const coursePeriodUsage = {};
    const generatedAllocations = [];
    const theoryStack = [];
    const p1UsedCourses = new Set();
    const lockedTheorySlotKeys = new Set();
    const lockedLabSlotKeys = new Set();

    const metrics = {
      modeRequested: requestedMode,
      modeExecuted: mode,
      seedUsed,
      totalSlots: days.length * periods.length,
      filledSlots: 0,
      theorySlotsFilled: 0,
      labSlotsFilled: 0,
      p1TheorySlotsFilled: 0,
      p1UnfilledDays: 0,
      utilizationPct: 0,
      conflictChecks: {
        slotBusy: 0,
        dailyLimit: 0,
        staffBusy: 0,
        staffFatigue: 0,
        labBusy: 0,
      },
      allocationsTried: 0,
      backtrackAttempts: 0,
      backtrackRollbacks: 0,
      exactNodesVisited: 0,
      exactStoppedByLimit: false,
      exactSolved: false,
      exactFallbackUsed: false,
      unallocatedTheoryHours: 0,
      unallocatedLabHours: 0,
      generationMs: 0,
    };

    courses.forEach((c) => {
      pendingTheory[c.courseId] = Number(c.lectureHours || 0) + Number(c.tutorialHours || 0);
      pendingLab[c.courseId] = Number(c.practicalHours || 0) + Number(c.experientialHours || 0);
      integratedCourseMap[c.courseId] = pendingTheory[c.courseId] > 0 && pendingLab[c.courseId] > 0;
      dailyCourseCounts[c.courseId] = {};
      days.forEach((d) => {
        dailyCourseCounts[c.courseId][d] = 0;
      });
      labDays[c.courseId] = new Set();
      coursePeriodUsage[c.courseId] = new Set();
    });

    // Mark existing semester allocations into local grid before generation.
    existingSemesterRows.forEach((row) => {
      const day = String(row.dayOfWeek || '').toUpperCase();
      const period = Number(row.periodNumber);
      if (!days.includes(day) || !periods.includes(period)) return;
      if (timetable[day][period] === null) {
        timetable[day][period] = {
          courseId: row.courseId,
          type: row.labId ? 'LAB' : 'THEORY',
          locked: true,
        };
      }

      const key = `${row.courseId}-${day}-${period}`;
      if (row.labId) {
        lockedLabSlotKeys.add(key);
        if (labDays[row.courseId]) labDays[row.courseId].add(day);
      } else {
        lockedTheorySlotKeys.add(key);
        if (dailyCourseCounts[row.courseId]) dailyCourseCounts[row.courseId][day] = 1;
        if (coursePeriodUsage[row.courseId]) coursePeriodUsage[row.courseId].add(period);
        if (period === 1) p1UsedCourses.add(row.courseId);
      }
    });

    // Reduce pending hours based on already locked allocations.
    lockedTheorySlotKeys.forEach((key) => {
      const [courseId] = key.split('-');
      if (pendingTheory[courseId] !== undefined) {
        pendingTheory[courseId] = Math.max(0, pendingTheory[courseId] - 1);
      }
    });
    lockedLabSlotKeys.forEach((key) => {
      const [courseId] = key.split('-');
      if (pendingLab[courseId] !== undefined) {
        pendingLab[courseId] = Math.max(0, pendingLab[courseId] - 1);
      }
    });

    // Base metrics include locked slots that already exist in DB.
    days.forEach((day) => {
      periods.forEach((period) => {
        const slot = timetable[day][period];
        if (!slot) return;
        metrics.filledSlots++;
        if (slot.type === 'LAB') metrics.labSlotsFilled++;
        if (slot.type === 'THEORY') metrics.theorySlotsFilled++;
      });
    });

    const isStaffFree = (staffId, day, p) => {
      metrics.conflictChecks.staffBusy++;
      if (!staffId) return true;
      if (globalStaffBusy[staffId]?.[`${day}-${p}`]) return false;
      if (timetable[day][p]) {
        const occupiedCourseId = timetable[day][p].courseId;
        if (staffMap[occupiedCourseId] === staffId) return false;
      }
      return true;
    };

    const isStaffFatigued = (staffId, day, p) => {
      metrics.conflictChecks.staffFatigue++;
      if (!staffId) return false;
      const check = (targetP) => {
        if (targetP < 1 || targetP > 8) return false;
        if (globalStaffBusy[staffId]?.[`${day}-${targetP}`]) return true;
        if (timetable[day][targetP]) {
          const cId = timetable[day][targetP].courseId;
          if (timetable[day][targetP].type === 'THEORY' && staffMap[cId] === staffId) return true;
        }
        return false;
      };
      return check(p - 1) || check(p + 1);
    };

    const getAvailableLabs = (day, periodList, countNeeded) => {
      const foundLabs = [];
      for (const room of labRooms) {
        let isFree = true;
        for (const p of periodList) {
          metrics.conflictChecks.labBusy++;
          if (globalLabBusy[room.labId]?.[`${day}-${p}`]) {
            isFree = false;
            break;
          }
          if (timetable[day][p] !== null) {
            isFree = false;
            break;
          }
        }
        if (isFree) foundLabs.push(room.labId);
        if (foundLabs.length >= countNeeded) return foundLabs;
      }
      return null;
    };

    const pushTheoryAllocation = (course, day, period) => {
      timetable[day][period] = { courseId: course.courseId, type: 'THEORY' };
      generatedAllocations.push({
        day,
        period,
        courseId: course.courseId,
        sectionId: null,
        labId: null,
        type: 'THEORY',
      });
      theoryStack.push({ day, period, courseId: course.courseId });
      pendingTheory[course.courseId]--;
      dailyCourseCounts[course.courseId][day]++;
      coursePeriodUsage[course.courseId].add(period);
      metrics.filledSlots++;
      metrics.theorySlotsFilled++;
    };

    const popTheoryAllocation = () => {
      const last = theoryStack.pop();
      if (!last) return false;
      const { day, period, courseId } = last;
      timetable[day][period] = null;
      pendingTheory[courseId]++;
      dailyCourseCounts[courseId][day] = Math.max(0, dailyCourseCounts[courseId][day] - 1);
      generatedAllocations.pop();
      metrics.filledSlots = Math.max(0, metrics.filledSlots - 1);
      metrics.theorySlotsFilled = Math.max(0, metrics.theorySlotsFilled - 1);
      return true;
    };

    const pushLabAllocation = (course, day, p1, p2, freeLabs) => {
      timetable[day][p1] = { courseId: course.courseId, type: 'LAB' };
      timetable[day][p2] = { courseId: course.courseId, type: 'LAB' };

      const courseSections = sectionMap[course.courseId] || [];
      if (courseSections.length > 0) {
        courseSections.forEach((sec, idx) => {
          generatedAllocations.push({ day, period: p1, courseId: course.courseId, sectionId: sec.sectionId, labId: freeLabs[idx], type: 'LAB' });
          generatedAllocations.push({ day, period: p2, courseId: course.courseId, sectionId: sec.sectionId, labId: freeLabs[idx], type: 'LAB' });
        });
      } else {
        generatedAllocations.push({ day, period: p1, courseId: course.courseId, sectionId: null, labId: freeLabs[0], type: 'LAB' });
        generatedAllocations.push({ day, period: p2, courseId: course.courseId, sectionId: null, labId: freeLabs[0], type: 'LAB' });
      }
      pendingLab[course.courseId] -= 2;
      labDays[course.courseId].add(day);
      metrics.filledSlots += 2;
      metrics.labSlotsFilled += 2;
    };

    const scoreTheoryCandidate = (course, day, period, tierWeight = 0, allowFatigue = true) => {
      let score = 100;
      score += Math.min(8, course.credits || 0) * 3;
      score += Math.min(6, pendingTheory[course.courseId]) * 4;
      if (coursePeriodUsage[course.courseId].has(period)) score -= 8;
      if (integratedCourseMap[course.courseId] && labDays[course.courseId].has(day)) score -= 40;
      if (period === 1) score += 6;
      if (!allowFatigue && isStaffFatigued(course.staffId, day, period)) score -= 14;
      score += tierWeight;
      score += rng();
      return score;
    };

    const findBestTheorySlot = (course, candidatePeriods, options = {}) => {
      const {
        enforceFatigue = true,
        enforceLabDayRule = true,
      } = options;

      let best = null;
      const daysOrder = shuffle(days, rng);
      const periodsOrder = shuffle(candidatePeriods, rng);
      for (const period of periodsOrder) {
        for (const day of daysOrder) {
          metrics.allocationsTried++;
          metrics.conflictChecks.slotBusy++;
          if (timetable[day][period] !== null) continue;
          metrics.conflictChecks.dailyLimit++;
          if (dailyCourseCounts[course.courseId][day] > 0) continue;
          if (!isStaffFree(course.staffId, day, period)) continue;
          if (enforceFatigue && isStaffFatigued(course.staffId, day, period)) continue;
          if (enforceLabDayRule && integratedCourseMap[course.courseId] && labDays[course.courseId].has(day)) continue;

          const tierWeight = candidatePeriods.includes(2) ? 8 : candidatePeriods.includes(7) ? 4 : 2;
          const score = scoreTheoryCandidate(course, day, period, tierWeight, !enforceFatigue);
          if (!best || score > best.score) {
            best = { day, period, score };
          }
        }
      }
      return best;
    };

    const runLabAllocation = () => {
      const labCourseList = courses
        .filter((c) => pendingLab[c.courseId] > 0)
        .sort((a, b) => pendingLab[b.courseId] - pendingLab[a.courseId]);

      for (const course of labCourseList) {
        while (pendingLab[course.courseId] >= 2) {
          let allocated = false;
          const blocks = strictLabBlocks;

          for (const [p1, p2] of blocks) {
            if (allocated) break;
            const dayOrder = shuffle(days, rng);
            const existingIndices = [...labDays[course.courseId]].map((d) => dayIndex[d]);
            const nonAdjacentDays = dayOrder.filter((d) => existingIndices.every((idx) => Math.abs(dayIndex[d] - idx) > 1));
            const daysToTry = nonAdjacentDays.length > 0 ? nonAdjacentDays : dayOrder;

            for (const day of daysToTry) {
              if (labDays[course.courseId].has(day)) continue;
              metrics.conflictChecks.slotBusy++;
              if (timetable[day][p1] !== null || timetable[day][p2] !== null) continue;
              if (!isStaffFree(course.staffId, day, p1) || !isStaffFree(course.staffId, day, p2)) continue;

              const courseSections = sectionMap[course.courseId] || [];
              const batchesNeeded = courseSections.length > 0 ? courseSections.length : 1;
              const freeLabs = getAvailableLabs(day, [p1, p2], batchesNeeded);
              if (!freeLabs) continue;

              pushLabAllocation(course, day, p1, p2, freeLabs);
              allocated = true;
              break;
            }
          }
          if (!allocated) break;
        }
      }
    };

    const runP1Allocation = () => {
      for (const day of days) {
        if (timetable[day][1] !== null) continue;
        const p1Candidates = courses
          .filter((c) => pendingTheory[c.courseId] > 0)
          .sort((a, b) => (b.credits - a.credits) || (pendingTheory[b.courseId] - pendingTheory[a.courseId]));
        let assigned = false;
        for (const course of p1Candidates) {
          if (p1UsedCourses.has(course.courseId)) continue;
          if (dailyCourseCounts[course.courseId][day] > 0) continue;
          if (!isStaffFree(course.staffId, day, 1)) continue;
          if (isStaffFatigued(course.staffId, day, 1)) continue;
          if (integratedCourseMap[course.courseId] && labDays[course.courseId].has(day)) continue;

          pushTheoryAllocation(course, day, 1);
          p1UsedCourses.add(course.courseId);
          metrics.p1TheorySlotsFilled++;
          assigned = true;
          break;
        }
        if (!assigned) continue;
      }
    };

    const runTheoryHeuristic = () => {
      const theoryCourses = courses.filter((c) => pendingTheory[c.courseId] > 0).sort((a, b) => b.credits - a.credits);

      for (const pGroup of priorityGroups) {
        let progress = true;
        while (progress) {
          progress = false;
          const shuffledCourses = shuffle(theoryCourses, rng);
          for (const course of shuffledCourses) {
            if (pendingTheory[course.courseId] <= 0) continue;
            const best = findBestTheorySlot(course, pGroup, {
              enforceFatigue: true,
              enforceLabDayRule: true,
            });
            if (best) {
              pushTheoryAllocation(course, best.day, best.period);
              progress = true;
            }
          }
        }
      }

      let safety = 0;
      while (courses.some((c) => pendingTheory[c.courseId] > 0) && safety < 1000) {
        safety++;
        let allocatedInPass = false;
        const courseOrder = shuffle(courses, rng).sort((a, b) => pendingTheory[b.courseId] - pendingTheory[a.courseId]);
        for (const course of courseOrder) {
          if (pendingTheory[course.courseId] <= 0) continue;
          const fallback = findBestTheorySlot(course, theoryPriorityPeriods, {
            enforceFatigue: true,
            enforceLabDayRule: true,
          });
          if (fallback) {
            pushTheoryAllocation(course, fallback.day, fallback.period);
            allocatedInPass = true;
          }
        }
        if (!allocatedInPass) break;
      }
    };

    const runBacktrackingRepair = () => {
      if (mode === 'heuristic' || maxBacktrackAttempts <= 0) return;
      let attempts = 0;
      while (attempts < maxBacktrackAttempts) {
        const pendingCourses = courses
          .filter((c) => pendingTheory[c.courseId] > 0)
          .sort((a, b) => pendingTheory[b.courseId] - pendingTheory[a.courseId]);
        if (!pendingCourses.length) break;

        attempts++;
        metrics.backtrackAttempts++;
        const target = pendingCourses[0];
        const direct = findBestTheorySlot(target, theoryPriorityPeriods, {
          enforceFatigue: true,
          enforceLabDayRule: true,
        });
        if (direct) {
          pushTheoryAllocation(target, direct.day, direct.period);
          continue;
        }

        let rolledBack = 0;
        while (rolledBack < backtrackDepth && theoryStack.length > 0) {
          if (!popTheoryAllocation()) break;
          rolledBack++;
        }
        metrics.backtrackRollbacks += rolledBack;
        if (rolledBack === 0) break;

        const retry = findBestTheorySlot(target, theoryPriorityPeriods, {
          enforceFatigue: true,
          enforceLabDayRule: true,
        });
        if (retry) {
          pushTheoryAllocation(target, retry.day, retry.period);
        }
      }
    };

    const runExactTheorySolver = () => {
      if (mode !== 'exact') return false;

      const started = Date.now();
      const candidatesFor = (course, enforceFatigue) => {
        const list = [];
        for (const day of days) {
          if (dailyCourseCounts[course.courseId][day] > 0) continue;
          for (const period of theoryPriorityPeriods) {
            if (timetable[day][period] !== null) continue;
            if (!isStaffFree(course.staffId, day, period)) continue;
            if (enforceFatigue && isStaffFatigued(course.staffId, day, period)) continue;
            if (integratedCourseMap[course.courseId] && labDays[course.courseId].has(day)) continue;
            const score = scoreTheoryCandidate(course, day, period, 0, false);
            list.push({ day, period, score });
          }
        }
        list.sort((a, b) => b.score - a.score);
        return list;
      };

      const solve = () => {
        metrics.exactNodesVisited++;
        if (metrics.exactNodesVisited > exactMaxNodes || (Date.now() - started) > exactTimeLimitMs) {
          metrics.exactStoppedByLimit = true;
          return false;
        }

        const pendingCourses = courses.filter((c) => pendingTheory[c.courseId] > 0);
        if (!pendingCourses.length) return true;

        let chosen = null;
        let chosenCandidates = null;
        for (const course of pendingCourses) {
          const cands = candidatesFor(course, true);
          if (!cands.length) return false;
          if (!chosen || cands.length < chosenCandidates.length) {
            chosen = course;
            chosenCandidates = cands;
          }
        }

        for (const cand of chosenCandidates) {
          pushTheoryAllocation(chosen, cand.day, cand.period);
          if (solve()) return true;
          popTheoryAllocation();
        }
        return false;
      };

      const solved = solve();
      metrics.exactSolved = solved;
      return solved;
    };

    runLabAllocation();
    runP1Allocation();
    metrics.p1UnfilledDays = days.filter((d) => timetable[d][1] === null).length;

    if (mode === 'exact') {
      const exactSolved = runExactTheorySolver();
      if (!exactSolved) {
        metrics.exactFallbackUsed = true;
        runTheoryHeuristic();
        runBacktrackingRepair();
      }
    } else {
      runTheoryHeuristic();
      runBacktrackingRepair();
    }

    const report = [];
    courses.forEach((c) => {
      if (pendingTheory[c.courseId] > 0) report.push(`Warning: ${c.courseCode} missing ${pendingTheory[c.courseId]} theory hours`);
      if (pendingLab[c.courseId] > 0) report.push(`Warning: ${c.courseCode} missing ${pendingLab[c.courseId]} lab hours`);
    });

    metrics.unallocatedTheoryHours = courses.reduce((sum, c) => sum + Math.max(0, pendingTheory[c.courseId]), 0);
    metrics.unallocatedLabHours = courses.reduce((sum, c) => sum + Math.max(0, pendingLab[c.courseId]), 0);
    metrics.utilizationPct = Number(((metrics.filledSlots / metrics.totalSlots) * 100).toFixed(2));

    if (generatedAllocations.length > 0) {
      const values = generatedAllocations.map((a) => [
        semesterId,
        Deptid,
        a.day,
        a.period,
        a.courseId,
        a.sectionId,
        a.labId,
        'YES',
        userEmail,
        userEmail,
      ]);
      await connection.query(
        `INSERT INTO Timetable
         (semesterId, Deptid, dayOfWeek, periodNumber, courseId, sectionId, labId, isActive, createdBy, updatedBy)
         VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    metrics.generationMs = Date.now() - generationStartedAt;

    const scheduleSummary = {};
    days.forEach((d) => {
      scheduleSummary[d] = {};
      periods.forEach((p) => {
        const slot = timetable[d][p];
        scheduleSummary[d][p] = slot
          ? {
              courseId: slot.courseId,
              courseCode: courseById[slot.courseId]?.courseCode || null,
              type: slot.type,
            }
          : null;
      });
    });

    res.status(200).json({
      status: 'success',
      message: report.length > 0 ? 'Generated with warnings' : 'Timetable Generated Successfully',
      report,
      metrics,
      data: scheduleSummary,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Gen Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  } finally {
    if (connection) connection.release();
  }
};
