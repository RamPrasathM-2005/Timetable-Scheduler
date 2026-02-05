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



export const autoGenerateTimetable = catchAsync(async (req, res) => {
  const { semesterId } = req.params;
  const userEmail = req.user?.email || "admin";
  const connection = await pool.getConnection();

  try {
    // Start a transaction to ensure data integrity
    await connection.beginTransaction();

    // =========================================================================
    // STEP 1: GATHER DATA & PREPARE STRUCTURES
    // =========================================================================

    // 1. Fetch Semester & Department Details
    // We need the DeptId to insert into the Timetable table later.
    const [semDetails] = await connection.execute(
      `SELECT s.semesterNumber, d.Deptid 
       FROM Semester s
       JOIN Batch b ON s.batchId = b.batchId
       JOIN department d ON b.branch = d.Deptacronym
       WHERE s.semesterId = ?`,
      [semesterId]
    );

    if (!semDetails.length) throw new Error("Semester details not found.");
    const { semesterNumber, Deptid } = semDetails[0];

    // 2. Fetch Courses with Detailed Hours and Staff Info
    // We get Lecture, Tutorial, Practical, Experiential hours separately.
    const [courses] = await connection.execute(
      `SELECT 
         c.courseId, c.courseCode, c.courseTitle, c.category, c.type,
         c.lectureHours, c.tutorialHours, c.practicalHours, c.experientialHours,
         (SELECT sc.Userid FROM StaffCourse sc WHERE sc.courseId = c.courseId LIMIT 1) as staffId
       FROM Course c
       WHERE c.semesterId = ? AND c.isActive = 'YES'`,
      [semesterId]
    );

    // 3. Build Global Staff Busy Map
    // This checks if the assigned staff are teaching in OTHER semesters at the same time.
    const staffIds = courses.map((c) => c.staffId).filter((id) => id);
    let globalStaffBusy = {}; 

    if (staffIds.length > 0) {
      const [busySlots] = await connection.query(
        `SELECT t.dayOfWeek, t.periodNumber, sc.Userid as staffId
         FROM Timetable t
         JOIN StaffCourse sc ON t.courseId = sc.courseId
         WHERE sc.Userid IN (?) 
           AND t.isActive = 'YES' 
           AND t.semesterId != ?`, // Exclude current semester (since we are regenerating it)
        [staffIds, semesterId]
      );
      
      busySlots.forEach((slot) => {
        if (!globalStaffBusy[slot.staffId]) globalStaffBusy[slot.staffId] = {};
        globalStaffBusy[slot.staffId][`${slot.dayOfWeek}-${slot.periodNumber}`] = true;
      });
    }

    // 4. Initialize the Timetable Grid (Empty)
    const days = ["MON", "TUE", "WED", "THU", "FRI"];
    const allPeriods = [1, 2, 3, 4, 5, 6, 7, 8];
    
    let timetable = {};
    days.forEach(d => {
      timetable[d] = {};
      allPeriods.forEach(p => timetable[d][p] = null);
    });

    // 5. Calculate Pending Hours & Weights
    let pendingTheory = {}; // Total Lecture + Tutorial hours needed
    let pendingLab = {};    // Total Practical + Experiential hours needed
    let courseWeights = {}; // Total Theory hours (used for sorting priority)
    let dailyCourseCounts = {}; // Tracks how many hours a course is placed per day
    let labDays = {}; // NEW: Tracks which day a course has a Lab (to avoid theory clash)

    courses.forEach(c => {
        const theoryHrs = (c.lectureHours || 0) + (c.tutorialHours || 0);
        const labHrs = (c.practicalHours || 0) + (c.experientialHours || 0);

        pendingTheory[c.courseId] = theoryHrs;
        pendingLab[c.courseId] = labHrs;
        courseWeights[c.courseId] = theoryHrs; 

        // Initialize trackers
        dailyCourseCounts[c.courseId] = {};
        labDays[c.courseId] = new Set(); // Stores days like "MON", "TUE" where Lab exists
        days.forEach(d => dailyCourseCounts[c.courseId][d] = 0);
    });

    const report = [];

    // Helper Function: Checks if a specific slot is empty and staff is free
    const isSlotValid = (day, period, staffId) => {
        if (timetable[day][period] !== null) return false; // Slot already taken
        if (staffId && globalStaffBusy[staffId]?.[`${day}-${period}`]) return false; // Staff busy in another semester
        return true;
    };

    // =========================================================================
    // STEP 2: ALLOCATION LOGIC
    // =========================================================================

    // -------------------------------------------------------------------------
    // PHASE 1: LABS (The Anchor)
    // Labs are placed first because they require blocks of 2 hours.
    // Logic: Try Periods 5,6 first. If full, try 7,8.
    // -------------------------------------------------------------------------
    const labCourses = courses.filter(c => pendingLab[c.courseId] > 0);
    
    for (const course of labCourses) {
        let hoursNeeded = pendingLab[course.courseId];
        let attempts = 0;
        
        // Loop until we place all lab hours or give up (50 tries)
        while (hoursNeeded >= 2 && attempts < 50) {
            attempts++;
            let placedBlock = false;
            
            // Pass 1: Look for Period 5 & 6 (Preferred)
            const shuffledDays1 = shuffle([...days]);
            for (const day of shuffledDays1) {
                if (isSlotValid(day, 5, course.staffId) && isSlotValid(day, 6, course.staffId)) {
                    timetable[day][5] = course.courseId;
                    timetable[day][6] = course.courseId;
                    pendingLab[course.courseId] -= 2;
                    hoursNeeded -= 2;
                    placedBlock = true;
                    
                    // Mark this day as having a Lab for this course
                    labDays[course.courseId].add(day); 
                    break; 
                }
            }

            // Pass 2: Look for Period 7 & 8 (Fallback)
            if (!placedBlock) {
                const shuffledDays2 = shuffle([...days]);
                for (const day of shuffledDays2) {
                    if (isSlotValid(day, 7, course.staffId) && isSlotValid(day, 8, course.staffId)) {
                        timetable[day][7] = course.courseId;
                        timetable[day][8] = course.courseId;
                        pendingLab[course.courseId] -= 2;
                        hoursNeeded -= 2;
                        placedBlock = true;
                        
                        // Mark this day as having a Lab for this course
                        labDays[course.courseId].add(day);
                        break;
                    }
                }
            }
            if (!placedBlock) break; 
        }

        // Handle odd leftover lab hours (if any exist)
        if (hoursNeeded > 0) {
             for (const day of shuffle([...days])) {
                 if (hoursNeeded === 0) break;
                 for (const p of [5,6,7,8]) {
                     if (isSlotValid(day, p, course.staffId)) {
                         timetable[day][p] = course.courseId;
                         pendingLab[course.courseId]--;
                         hoursNeeded--;
                         labDays[course.courseId].add(day);
                         break;
                     }
                 }
             }
        }
    }

    // -------------------------------------------------------------------------
    // PHASE 2: PERIOD 1 PRIORITY (High Credit Theory)
    // Goal: Use Period 1 for the heaviest theory subjects.
    // Logic: Sort by Credit Weight -> Try to fill Mon-Fri Period 1 with unique subjects.
    // -------------------------------------------------------------------------
    
    // Filter & Sort Theory Courses (Highest Credits First)
    let theoryCourses = courses.filter(c => pendingTheory[c.courseId] > 0);
    theoryCourses.sort((a, b) => courseWeights[b.courseId] - courseWeights[a.courseId]);

    const period1UsedCourses = new Set();
    const shuffledDays = shuffle([...days]);

    for (const day of shuffledDays) {
        let placedPeriod1 = false;

        // Attempt: Find highest credit course NOT used in Period 1 yet
        for (const course of theoryCourses) {
            if (pendingTheory[course.courseId] > 0 && !period1UsedCourses.has(course.courseId)) {
                
                // Constraint: Avoid Theory if Lab is on the same day
                if (labDays[course.courseId].has(day)) continue;

                if (dailyCourseCounts[course.courseId][day] === 0 && isSlotValid(day, 1, course.staffId)) {
                    timetable[day][1] = course.courseId;
                    pendingTheory[course.courseId]--;
                    dailyCourseCounts[course.courseId][day]++;
                    period1UsedCourses.add(course.courseId);
                    placedPeriod1 = true;
                    break;
                }
            }
        }

        // Fallback: If we can't find a unique one, reuse ANY available high-credit course
        if (!placedPeriod1) {
             for (const course of theoryCourses) {
                if (pendingTheory[course.courseId] > 0) {
                    if (dailyCourseCounts[course.courseId][day] === 0 && isSlotValid(day, 1, course.staffId)) {
                        timetable[day][1] = course.courseId;
                        pendingTheory[course.courseId]--;
                        dailyCourseCounts[course.courseId][day]++;
                        placedPeriod1 = true;
                        break;
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // PHASE 3: FILL REMAINING THEORY
    // Logic: Fill remaining hours prioritizing Morning > Late Afternoon > Lunch.
    // -------------------------------------------------------------------------
    let grandTotalTheory = 0;
    courses.forEach(c => grandTotalTheory += pendingTheory[c.courseId]);

    let safetyLoop = 0;
    
    // Loop until all hours are placed or we hit 1000 iterations (deadlock prevention)
    while (grandTotalTheory > 0 && safetyLoop < 1000) {
        safetyLoop++;
        let madeProgress = false;

        // Shuffle courses every time to ensure random distribution
        const courseList = shuffle([...courses]);

        for (const course of courseList) {
            if (pendingTheory[course.courseId] <= 0) continue;

            // Priority: Morning(1-4) > Late(7-8) > Mid(5-6)
            const morning = shuffle([1, 2, 3, 4]);
            const lateAfternoon = shuffle([7, 8]);
            const midAfternoon = shuffle([5, 6]);
            let preferredPeriods = [...morning, ...lateAfternoon, ...midAfternoon];

            // Pick a random day
            const day = days[Math.floor(Math.random() * days.length)];

            // CONSTRAINT 1: Distribution (Max 1 hr/day per course)
            // We relax this if we are struggling (safetyLoop > 50)
            if (dailyCourseCounts[course.courseId][day] > 0 && safetyLoop < 50) continue;

            // CONSTRAINT 2: LAB CLASH AVOIDANCE (The New Request)
            // If this course has a Lab today, try NOT to schedule Theory.
            // But if safetyLoop > 100 (Impossible to fit), we relax this rule.
            if (labDays[course.courseId].has(day) && safetyLoop < 100) continue;

            // Try to find a valid slot
            for (const p of preferredPeriods) {
                if (isSlotValid(day, p, course.staffId)) {
                    timetable[day][p] = course.courseId;
                    pendingTheory[course.courseId]--;
                    dailyCourseCounts[course.courseId][day]++;
                    grandTotalTheory--;
                    madeProgress = true;
                    break; 
                }
            }
        }

        // If no progress for 500 loops, we assume deadlock and stop
        if (!madeProgress && safetyLoop > 500) break; 
    }

    // Report any unassigned hours
    courses.forEach(c => {
        if (pendingTheory[c.courseId] > 0) report.push(`Warning: ${course.courseCode} missing ${pendingTheory[c.courseId]} theory hours`);
    });

    // =========================================================================
    // STEP 3: SAVE TO DATABASE
    // =========================================================================
    
    // 1. Clear existing timetable for this semester
    await connection.execute(`DELETE FROM Timetable WHERE semesterId = ?`, [semesterId]);

    // 2. Prepare bulk insert
    const insertValues = [];
    days.forEach(day => {
        allPeriods.forEach(p => {
            const cId = timetable[day][p];
            if (cId) {
                insertValues.push([
                    semesterId, Deptid, day, p, cId, 'YES', userEmail, userEmail
                ]);
            }
        });
    });

    // 3. Execute Insert
    if (insertValues.length > 0) {
        await connection.query(
            `INSERT INTO Timetable (semesterId, Deptid, dayOfWeek, periodNumber, courseId, isActive, createdBy, updatedBy)
             VALUES ?`,
            [insertValues]
        );
    }

    await connection.commit();

    // 4. Send Response
    res.status(200).json({
      status: "success",
      message: report.length > 0 ? "Generated with warnings" : "Timetable Generated Successfully",
      report: report,
      data: timetable
    });

  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ status: "failure", message: "Generation Failed: " + err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Utility: Fisher-Yates Shuffle
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};