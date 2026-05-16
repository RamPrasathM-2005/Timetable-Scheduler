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
             COALESCE(c.courseCode, '') AS courseCode,
             COALESCE(c.courseTitle, c.courseId) AS courseTitle, 
             COALESCE(s.sectionName, 'No Section') AS sectionName,
             COALESCE(
               NULLIF(GROUP_CONCAT(DISTINCT u.username SEPARATOR ' / '), ''),
               MAX(u_created.username),
               'Unassigned'
             ) AS staffNames
      FROM Timetable t
      LEFT JOIN Course c ON t.courseId = c.courseId AND c.isActive = "YES"
      LEFT JOIN Section s ON t.sectionId = s.sectionId AND (s.isActive = "YES" OR s.isActive IS NULL)
      LEFT JOIN StaffCourse sc ON sc.courseId = t.courseId
      LEFT JOIN users u ON sc.Userid = u.Userid AND u.status = "active"
      LEFT JOIN users u_created ON t.createdBy = u_created.email
      WHERE t.semesterId = ? 
        AND t.isActive = "YES" 
        AND (t.dayOfWeek IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT') OR t.dayOfWeek IS NULL)
        AND (t.periodNumber BETWEEN 1 AND 8 OR t.periodNumber IS NULL)
      GROUP BY t.timetableId, c.courseId, t.sectionId, t.dayOfWeek, t.periodNumber, c.courseCode, c.courseTitle, s.sectionName
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

export const getTimetableByStaff = catchAsync(async (req, res) => {
  const { staffId } = req.params;
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

    if (!staffId || isNaN(staffId) || Number(staffId) <= 0) {
      throw new Error('Invalid staffId');
    }

    const [staffRows] = await connection.execute(
      "SELECT Userid FROM users WHERE Userid = ? AND role = 'Staff' AND status = 'active'",
      [staffId]
    );
    if (staffRows.length === 0) {
      return res.status(404).json({
        status: 'failure',
        message: `No
        
        
        
        active staff found with Userid ${staffId}`,
        data: [],
      });
      
    }

    const [rows] = await connection.execute(
      `
      SELECT 
        t.timetableId,
        t.dayOfWeek,
        t.periodNumber,
        t.courseId,
        t.sectionId,
        t.semesterId,
        t.Deptid,
        COALESCE(c.courseCode, '') AS courseCode,
        COALESCE(c.courseTitle, c.courseId) AS courseTitle,
        COALESCE(s.sectionName, 'No Section') AS sectionName
      FROM Timetable t
      INNER JOIN StaffCourse sc 
        ON sc.courseId = t.courseId 
        AND sc.Userid = ?
        AND (sc.sectionId = t.sectionId OR t.sectionId IS NULL)
      LEFT JOIN Course c ON t.courseId = c.courseId AND c.isActive = 'YES'
      LEFT JOIN Section s ON t.sectionId = s.sectionId AND (s.isActive = 'YES' OR s.isActive IS NULL)
      WHERE t.isActive = 'YES'
        AND (t.dayOfWeek IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT') OR t.dayOfWeek IS NULL)
        AND (t.periodNumber BETWEEN 1 AND 8 OR t.periodNumber IS NULL)
      ORDER BY FIELD(t.dayOfWeek, 'MON','TUE','WED','THU','FRI','SAT'), t.periodNumber
      `,
      [staffId]
    );

    await connection.commit();
    res.status(200).json({
      status: 'success',
      data: rows || [],
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error fetching timetable by staff:', error);
    res.status(error.message.includes('No active user') || error.message.includes('Invalid staffId') ? 400 : 500).json({
      status: 'failure',
      message: `Failed to fetch timetable by staff: ${error.message}`,
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

      // B. Do not overwrite existing semester allocations for this slot
      let slotQuery = `SELECT timetableId FROM Timetable
        WHERE semesterId = ? AND dayOfWeek = ? AND periodNumber = ? AND isActive = 'YES'`;
      const slotParams = [semesterId, day, period];
      if (alloc.sectionId) {
        slotQuery += ` AND (sectionId = ? OR sectionId IS NULL)`;
        slotParams.push(alloc.sectionId);
      }
      const [slotConflict] = await connection.execute(slotQuery, slotParams);
      if (slotConflict.length > 0) {
        throw new Error(`Conflict: Slot already allocated for this semester/section. Please clear it manually before reallocating.`);
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
    const status = String(error.message || '').startsWith('Conflict:') ? 409 : 400;
    res.status(status).json({ message: error.message });
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

    // 2. STUDENT/SECTION CONFLICT CHECK (do not overwrite existing allocations)
    let conflictQuery = `SELECT timetableId FROM Timetable WHERE semesterId = ? AND dayOfWeek = ? AND periodNumber = ? AND isActive = 'YES'`;
    const conflictParams = [semesterId, day, period];

    if (sectionId) {
      conflictQuery += ` AND (sectionId = ? OR sectionId IS NULL)`;
      conflictParams.push(sectionId);
    }

    const [slotConflict] = await connection.execute(conflictQuery, conflictParams);
    if (slotConflict.length > 0) {
      throw new Error(`Conflict: Slot already allocated for this semester/section. Please clear it manually before reallocating.`);
    }

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
    const status = String(error.message || '').startsWith('Conflict:') ? 409 : 500;
    res.status(status).json({ message: error.message || "Failed to allocate lab session" });
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
  const ignoreGlobalLabBusy = String(req.body?.ignoreGlobalLabBusy ?? req.query?.ignoreGlobalLabBusy ?? 'false').toLowerCase() === 'true';
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
         c.courseId, c.courseCode, c.courseTitle, c.type, c.credits,
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
    const sectionMap = {};
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
    const allStaffIdsSet = new Set();
    if (courseIds.length > 0) {
      const [staffRows] = await connection.query(
        `SELECT courseId, Userid FROM StaffCourse WHERE courseId IN (?)`,
        [courseIds]
      );
      staffRows.forEach((r) => {
        if (!staffMap[r.courseId]) staffMap[r.courseId] = new Set();
        staffMap[r.courseId].add(r.Userid);
        allStaffIdsSet.add(r.Userid);
      });
    }
    const allStaffIds = [...allStaffIdsSet];

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
    if (!ignoreGlobalLabBusy && labRooms.length > 0) {
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

    // Auto-gen rebuilds the semester timetable from scratch on each run.
    // Keeping old rows as locked slots causes previous bad generations to persist.
    await connection.execute(
      `DELETE FROM Timetable WHERE semesterId = ?`,
      [semesterId]
    );
    const existingSemesterRows = [];

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];
    const priorityGroups = [
      [2, 3, 4],
      [5, 6],
      [7, 8],
    ];
    const theoryPriorityPeriods = [2, 3, 4, 5, 6, 7, 8];
    // Preferred lab blocks, but allow early blocks if late ones aren't possible.
    const strictLabBlocks = [
      [5, 6],
      [7, 8],
      [1, 2],
      [3, 4],
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
    const courseGroupMap = {};
    const groupTheoryDayCounts = {};
    const groupLabDayCounts = {};
    const groupHourProfile = {};
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
      ignoreGlobalLabBusy,
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
      relaxedPassUsed: false,
      relaxedTheorySlots: 0,
      relaxedLabSlots: 0,
      criticalTheorySlots: 0,
      ultraRelaxedTheorySlots: 0,
      ultraRelaxedLabSlots: 0,
      unallocatedTheoryHours: 0,
      unallocatedLabHours: 0,
      generationMs: 0,
      labBlockRejections: {
        slotOccupied: 0,
        staffBusy: 0,
        staffConsecutive: 0,
        noLabs: 0,
      },
    };

    courses.forEach((c) => {
      const groupKey = String(c.courseTitle || c.courseCode || c.courseId || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
      pendingTheory[c.courseId] = Number(c.lectureHours || 0) + Number(c.tutorialHours || 0);
      pendingLab[c.courseId] = Number(c.practicalHours || 0) + Number(c.experientialHours || 0);
      courseGroupMap[c.courseId] = groupKey;
      if (!groupTheoryDayCounts[groupKey]) groupTheoryDayCounts[groupKey] = {};
      if (!groupLabDayCounts[groupKey]) groupLabDayCounts[groupKey] = {};
      if (!groupHourProfile[groupKey]) groupHourProfile[groupKey] = { theory: 0, lab: 0 };
      groupHourProfile[groupKey].theory += pendingTheory[c.courseId];
      groupHourProfile[groupKey].lab += pendingLab[c.courseId];
      dailyCourseCounts[c.courseId] = {};
      days.forEach((d) => {
        dailyCourseCounts[c.courseId][d] = 0;
        groupTheoryDayCounts[groupKey][d] = groupTheoryDayCounts[groupKey][d] || 0;
        groupLabDayCounts[groupKey][d] = groupLabDayCounts[groupKey][d] || 0;
      });
      labDays[c.courseId] = new Set();
      coursePeriodUsage[c.courseId] = new Set();
    });
    courses.forEach((c) => {
      const groupKey = courseGroupMap[c.courseId];
      integratedCourseMap[c.courseId] =
        (groupHourProfile[groupKey]?.theory || 0) > 0 &&
        (groupHourProfile[groupKey]?.lab || 0) > 0;
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
        const groupKey = courseGroupMap[row.courseId];
        if (groupKey && groupLabDayCounts[groupKey]) {
          groupLabDayCounts[groupKey][day] = (groupLabDayCounts[groupKey][day] || 0) + 1;
        }
      } else {
        lockedTheorySlotKeys.add(key);
        if (dailyCourseCounts[row.courseId]) {
          dailyCourseCounts[row.courseId][day] = (dailyCourseCounts[row.courseId][day] || 0) + 1;
        }
        const groupKey = courseGroupMap[row.courseId];
        if (groupKey && groupTheoryDayCounts[groupKey]) {
          groupTheoryDayCounts[groupKey][day] = (groupTheoryDayCounts[groupKey][day] || 0) + 1;
        }
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

    const getCourseStaffIds = (courseId) => staffMap[courseId] || new Set();
    const hasTheoryOnDay = (courseId, day) => {
      const groupKey = courseGroupMap[courseId];
      return ((groupTheoryDayCounts[groupKey]?.[day] || 0) > 0) || ((dailyCourseCounts[courseId]?.[day] || 0) > 0);
    };
    const hasLabOnDay = (courseId, day) => {
      const groupKey = courseGroupMap[courseId];
      return ((groupLabDayCounts[groupKey]?.[day] || 0) > 0) || (labDays[courseId]?.has(day) || false);
    };

    const isStaffFree = (staffIds, day, p) => {
      metrics.conflictChecks.staffBusy++;
      if (!staffIds || staffIds.size === 0) return true;
      for (const staffId of staffIds) {
        if (globalStaffBusy[staffId]?.[`${day}-${p}`]) return false;
        if (timetable[day][p]) {
          const occupiedCourseId = timetable[day][p].courseId;
          const occupiedStaffIds = getCourseStaffIds(occupiedCourseId);
          if (occupiedStaffIds.has(staffId)) return false;
        }
      }
      return true;
    };

    // Relaxed staff check: ignore other-semester conflicts, but still prevent
    // a staff from being double-booked within this semester's grid.
    const isStaffFreeLocal = (staffIds, day, p) => {
      metrics.conflictChecks.staffBusy++;
      if (!staffIds || staffIds.size === 0) return true;
      if (timetable[day][p]) {
        const occupiedCourseId = timetable[day][p].courseId;
        const occupiedStaffIds = getCourseStaffIds(occupiedCourseId);
        for (const staffId of staffIds) {
          if (occupiedStaffIds.has(staffId)) return false;
        }
      }
      return true;
    };

    const isStaffFatigued = (staffIds, day, p) => {
      metrics.conflictChecks.staffFatigue++;
      if (!staffIds || staffIds.size === 0) return false;
      const check = (targetP) => {
        if (targetP < 1 || targetP > 8) return false;
        for (const staffId of staffIds) {
          if (globalStaffBusy[staffId]?.[`${day}-${targetP}`]) return true;
          if (timetable[day][targetP]) {
            const cId = timetable[day][targetP].courseId;
            const occupiedStaffIds = getCourseStaffIds(cId);
            if (occupiedStaffIds.has(staffId)) return true;
          }
        }
        return false;
      };
      return check(p - 1) || check(p + 1);
    };

    const getAvailableLabs = (day, periodList, countNeeded) => {
      const foundLabs = [];
      // Shuffle rooms to avoid always filling the same labs first.
      const roomsOrder = shuffle(labRooms, rng);
      for (const room of roomsOrder) {
        let isFree = true;
        for (const p of periodList) {
          metrics.conflictChecks.labBusy++;
          if (!ignoreGlobalLabBusy && globalLabBusy[room.labId]?.[`${day}-${p}`]) {
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
      if (courseGroupMap[course.courseId]) {
        groupTheoryDayCounts[courseGroupMap[course.courseId]][day] =
          (groupTheoryDayCounts[courseGroupMap[course.courseId]][day] || 0) + 1;
      }
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
      if (courseGroupMap[courseId]) {
        groupTheoryDayCounts[courseGroupMap[courseId]][day] = Math.max(
          0,
          (groupTheoryDayCounts[courseGroupMap[courseId]][day] || 0) - 1
        );
      }
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
      if (courseGroupMap[course.courseId]) {
        groupLabDayCounts[courseGroupMap[course.courseId]][day] =
          (groupLabDayCounts[courseGroupMap[course.courseId]][day] || 0) + 1;
      }
      metrics.filledSlots += 2;
      metrics.labSlotsFilled += 2;
    };

    const scoreTheoryCandidate = (course, day, period, tierWeight = 0, allowFatigue = true) => {
      const staffIds = getCourseStaffIds(course.courseId);
      let score = 100;
      score += Math.min(8, course.credits || 0) * 3;
      score += Math.min(6, pendingTheory[course.courseId]) * 4;
      if (coursePeriodUsage[course.courseId].has(period)) score -= 8;
      if (integratedCourseMap[course.courseId] && hasLabOnDay(course.courseId, day)) score -= 40;
      if (period === 1) score += 6;
      if (!allowFatigue && isStaffFatigued(staffIds, day, period)) score -= 14;
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
          if (dailyCourseCounts[course.courseId][day] >= 2) continue;
          if (hasTheoryOnDay(course.courseId, day)) continue;
          const staffIds = getCourseStaffIds(course.courseId);
          if (!isStaffFree(staffIds, day, period)) continue;
          if (enforceFatigue && isStaffFatigued(staffIds, day, period)) continue;
          if (enforceLabDayRule && integratedCourseMap[course.courseId] && hasLabOnDay(course.courseId, day)) continue;

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
              if (integratedCourseMap[course.courseId] && hasTheoryOnDay(course.courseId, day)) continue;
              metrics.conflictChecks.slotBusy++;
              if (timetable[day][p1] !== null || timetable[day][p2] !== null) {
                metrics.labBlockRejections.slotOccupied++;
                continue;
              }
              const staffIds = getCourseStaffIds(course.courseId);
              if (!isStaffFree(staffIds, day, p1) || !isStaffFree(staffIds, day, p2)) {
                metrics.labBlockRejections.staffBusy++;
                continue;
              }
              // Hard constraint: no consecutive periods for staff, except the lab block itself.
              if (isStaffFatigued(staffIds, day, p1) || isStaffFatigued(staffIds, day, p2)) {
                metrics.labBlockRejections.staffConsecutive++;
                continue;
              }

              const courseSections = sectionMap[course.courseId] || [];
              const batchesNeeded = courseSections.length > 0 ? courseSections.length : 1;
              const freeLabs = getAvailableLabs(day, [p1, p2], batchesNeeded);
              if (!freeLabs) {
                metrics.labBlockRejections.noLabs++;
                continue;
              }

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
          if (dailyCourseCounts[course.courseId][day] >= 2) continue;
          if (hasTheoryOnDay(course.courseId, day)) continue;
          const staffIds = getCourseStaffIds(course.courseId);
          if (!isStaffFree(staffIds, day, 1)) continue;
          if (isStaffFatigued(staffIds, day, 1)) continue;
          if (integratedCourseMap[course.courseId] && hasLabOnDay(course.courseId, day)) continue;

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

    const relaxed = { theory: 0, lab: 0 };
    const critical = { theory: 0 };
    const allLabBlocks = [];
    for (let p = 1; p <= 7; p++) allLabBlocks.push([p, p + 1]);

    const runRelaxedLabAllocation = () => {
      let progress = true;
      let safety = 0;
      while (progress && safety < 5000) {
        safety++;
        progress = false;
        const labCourseList = courses
          .filter((c) => pendingLab[c.courseId] > 0)
          .sort((a, b) => pendingLab[b.courseId] - pendingLab[a.courseId]);

        for (const course of labCourseList) {
          let allocatedForCourse = false;
          while (pendingLab[course.courseId] >= 2) {
            allocatedForCourse = false;
            const dayOrder = shuffle(days, rng);
            const blockOrder = shuffle(allLabBlocks, rng);
            for (const day of dayOrder) {
              if (allocatedForCourse) break;
              for (const [p1, p2] of blockOrder) {
                metrics.conflictChecks.slotBusy++;
                if (timetable[day][p1] !== null || timetable[day][p2] !== null) continue;
                if (integratedCourseMap[course.courseId] && hasTheoryOnDay(course.courseId, day)) continue;

                const courseSections = sectionMap[course.courseId] || [];
                const batchesNeeded = courseSections.length > 0 ? courseSections.length : 1;
                const freeLabs = getAvailableLabs(day, [p1, p2], batchesNeeded);
                if (!freeLabs) continue;

                // Relaxed: allow lab-day spacing relaxation, but keep staff conflict/fatigue hard.
                const staffIds = getCourseStaffIds(course.courseId);
                if (!isStaffFree(staffIds, day, p1) || !isStaffFree(staffIds, day, p2)) {
                  metrics.labBlockRejections.staffBusy++;
                  continue;
                }
                if (isStaffFatigued(staffIds, day, p1) || isStaffFatigued(staffIds, day, p2)) {
                  metrics.labBlockRejections.staffConsecutive++;
                  continue;
                }
                pushLabAllocation(course, day, p1, p2, freeLabs);
                relaxed.lab += 2;
                allocatedForCourse = true;
                progress = true;
                break;
              }
            }
            if (!allocatedForCourse) break;
          }
        }
      }
    };

    const runRelaxedTheoryAllocation = () => {
      let progress = true;
      let safety = 0;
      while (progress && safety < 8000) {
        safety++;
        progress = false;
        const courseOrder = shuffle(courses, rng).sort((a, b) => pendingTheory[b.courseId] - pendingTheory[a.courseId]);
        for (const course of courseOrder) {
          while (pendingTheory[course.courseId] > 0) {
            let placed = false;
            const dayOrder = shuffle(days, rng);
            const periodOrder = shuffle(periods, rng);
            for (const day of dayOrder) {
              if (placed) break;
              for (const period of periodOrder) {
                metrics.conflictChecks.slotBusy++;
                if (timetable[day][period] !== null) continue;

                // Relaxed: keep staff conflict/fatigue hard, relax daily limits only.
                const staffIds = getCourseStaffIds(course.courseId);
                if (hasTheoryOnDay(course.courseId, day)) continue;
                if (!isStaffFree(staffIds, day, period)) continue;
                if (isStaffFatigued(staffIds, day, period)) continue;
                if (integratedCourseMap[course.courseId] && hasLabOnDay(course.courseId, day)) continue;
                pushTheoryAllocation(course, day, period);
                relaxed.theory += 1;
                placed = true;
                progress = true;
                break;
              }
            }
            if (!placed) break;
          }
        }
      }
    };

    // Critical pass: still respect staff fatigue (no consecutive periods), but relax other constraints.
    const runCriticalTheoryAllocation = () => {
      let progress = true;
      let safety = 0;
      while (progress && safety < 8000) {
        safety++;
        progress = false;
        const courseOrder = shuffle(courses, rng).sort((a, b) => pendingTheory[b.courseId] - pendingTheory[a.courseId]);
        for (const course of courseOrder) {
          while (pendingTheory[course.courseId] > 0) {
            let placed = false;
            const dayOrder = shuffle(days, rng);
            const periodOrder = shuffle(periods, rng);
            const staffIds = getCourseStaffIds(course.courseId);
            for (const day of dayOrder) {
              if (placed) break;
              for (const period of periodOrder) {
                metrics.conflictChecks.slotBusy++;
                if (timetable[day][period] !== null) continue;
                if (hasTheoryOnDay(course.courseId, day)) continue;
                if (!isStaffFree(staffIds, day, period)) continue;
                if (isStaffFatigued(staffIds, day, period)) continue;
                // Critical: ignore daily limits, but keep lab-day separation and staff fatigue hard.
                if (integratedCourseMap[course.courseId] && hasLabOnDay(course.courseId, day)) continue;
                pushTheoryAllocation(course, day, period);
                critical.theory += 1;
                placed = true;
                progress = true;
                break;
              }
            }
            if (!placed) break;
          }
        }
      }
    };

    // Ultra-relaxed pass: allow consecutive periods and ignore other-semester staff conflicts.
    // Still prevents same-slot conflicts within this semester's grid.
    const runUltraRelaxedLabAllocation = () => {
      let progress = true;
      let safety = 0;
      while (progress && safety < 8000) {
        safety++;
        progress = false;
        const labCourseList = courses
          .filter((c) => pendingLab[c.courseId] > 0)
          .sort((a, b) => pendingLab[b.courseId] - pendingLab[a.courseId]);

        for (const course of labCourseList) {
          while (pendingLab[course.courseId] >= 2) {
            let placed = false;
            const dayOrder = shuffle(days, rng);
            const blockOrder = shuffle(allLabBlocks, rng);
            for (const day of dayOrder) {
              if (placed) break;
              for (const [p1, p2] of blockOrder) {
                metrics.conflictChecks.slotBusy++;
                if (timetable[day][p1] !== null || timetable[day][p2] !== null) continue;
                if (integratedCourseMap[course.courseId] && hasTheoryOnDay(course.courseId, day)) continue;

                const courseSections = sectionMap[course.courseId] || [];
                const batchesNeeded = courseSections.length > 0 ? courseSections.length : 1;
                const freeLabs = getAvailableLabs(day, [p1, p2], batchesNeeded);
                if (!freeLabs) continue;

                const staffIds = getCourseStaffIds(course.courseId);
                if (!isStaffFreeLocal(staffIds, day, p1) || !isStaffFreeLocal(staffIds, day, p2)) continue;

                pushLabAllocation(course, day, p1, p2, freeLabs);
                metrics.ultraRelaxedLabSlots += 2;
                placed = true;
                progress = true;
                break;
              }
            }
            if (!placed) break;
          }
        }
      }
    };

    const runUltraRelaxedTheoryAllocation = () => {
      let progress = true;
      let safety = 0;
      while (progress && safety < 12000) {
        safety++;
        progress = false;
        const courseOrder = shuffle(courses, rng).sort((a, b) => pendingTheory[b.courseId] - pendingTheory[a.courseId]);
        for (const course of courseOrder) {
          while (pendingTheory[course.courseId] > 0) {
            let placed = false;
            const dayOrder = shuffle(days, rng);
            const periodOrder = shuffle(periods, rng);
            const staffIds = getCourseStaffIds(course.courseId);
            for (const day of dayOrder) {
              if (placed) break;
              for (const period of periodOrder) {
                metrics.conflictChecks.slotBusy++;
                if (timetable[day][period] !== null) continue;
                if (hasTheoryOnDay(course.courseId, day)) continue;
                if (!isStaffFreeLocal(staffIds, day, period)) continue;
                // Ultra-relaxed: ignore fatigue and daily limits, but still keep theory/lab on separate days.
                if (integratedCourseMap[course.courseId] && hasLabOnDay(course.courseId, day)) continue;
                pushTheoryAllocation(course, day, period);
                metrics.ultraRelaxedTheorySlots += 1;
                placed = true;
                progress = true;
                break;
              }
            }
            if (!placed) break;
          }
        }
      }
    };

    const runExactTheorySolver = () => {
      if (mode !== 'exact') return false;

      const started = Date.now();
      const candidatesFor = (course, enforceFatigue) => {
        const list = [];
        for (const day of days) {
          if (dailyCourseCounts[course.courseId][day] >= 2) continue;
          if (hasTheoryOnDay(course.courseId, day)) continue;
          for (const period of theoryPriorityPeriods) {
            if (timetable[day][period] !== null) continue;
            const staffIds = getCourseStaffIds(course.courseId);
            if (!isStaffFree(staffIds, day, period)) continue;
            if (enforceFatigue && isStaffFatigued(staffIds, day, period)) continue;
            if (integratedCourseMap[course.courseId] && hasLabOnDay(course.courseId, day)) continue;
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
    // If strict lab blocks couldn't fit everything, relax lab placement *before* theory
    // so labs can claim free consecutive slots before theory fills the grid.
    if (courses.some((c) => pendingLab[c.courseId] > 0)) {
      runRelaxedLabAllocation();
    }
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

    // Final relaxed pass to ensure all courses are allocated where possible.
    if (courses.some((c) => pendingLab[c.courseId] > 0 || pendingTheory[c.courseId] > 0)) {
      runRelaxedLabAllocation();
      runRelaxedTheoryAllocation();
    }

    // Critical pass: only if theory still unallocated after relaxed pass.
    if (courses.some((c) => pendingTheory[c.courseId] > 0)) {
      runCriticalTheoryAllocation();
    }

    // Ultra-relaxed pass: only if anything still unallocated.
    if (courses.some((c) => pendingLab[c.courseId] > 0)) {
      runUltraRelaxedLabAllocation();
    }
    if (courses.some((c) => pendingTheory[c.courseId] > 0)) {
      runUltraRelaxedTheoryAllocation();
    }

    const report = [];
    courses.forEach((c) => {
      if (pendingTheory[c.courseId] > 0) report.push(`Warning: ${c.courseCode} missing ${pendingTheory[c.courseId]} theory hours`);
      if (pendingLab[c.courseId] > 0) report.push(`Warning: ${c.courseCode} missing ${pendingLab[c.courseId]} lab hours`);
    });
    if (relaxed.theory > 0 || relaxed.lab > 0) {
      report.push(`Relaxed allocation used: ${relaxed.theory} theory slots, ${relaxed.lab} lab slots`);
    }

    metrics.relaxedPassUsed = relaxed.theory > 0 || relaxed.lab > 0;
    metrics.relaxedTheorySlots = relaxed.theory;
    metrics.relaxedLabSlots = relaxed.lab;
    metrics.criticalTheorySlots = critical.theory;
    metrics.unallocatedTheoryHours = courses.reduce((sum, c) => sum + Math.max(0, pendingTheory[c.courseId]), 0);
    metrics.unallocatedLabHours = courses.reduce((sum, c) => sum + Math.max(0, pendingLab[c.courseId]), 0);
    metrics.utilizationPct = Number(((metrics.filledSlots / metrics.totalSlots) * 100).toFixed(2));

    const hasUnallocated = courses.some(
      (c) => pendingTheory[c.courseId] > 0 || pendingLab[c.courseId] > 0
    );

    // If any hours remain unallocated, do not persist a partial timetable.
    if (hasUnallocated) {
      await connection.rollback();
      return res.status(409).json({
        status: 'failure',
        message: 'Unable to allocate all courses with current constraints.',
        report,
        metrics,
      });
    }

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
