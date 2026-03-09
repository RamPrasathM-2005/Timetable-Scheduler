import pool from '../db.js'

export const createLab = async (req, res) => {
  const { labName, capacity, Deptid } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO LabRooms (labName, capacity, Deptid) VALUES (?, ?, ?)`,
      [labName, capacity, Deptid]
    );
    res.status(201).json({ message: "Lab Created Successfully", labId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "A lab with this name already exists in this department." });
    }
    res.status(500).json({ message: error.message });
  }
};

// 2. Get All Labs for a Department
export const getLabsByDept = async (req, res) => {
  const { deptId } = req.params;
  try {
    const [labs] = await pool.execute(
      `SELECT * FROM LabRooms WHERE Deptid = ? AND isActive = 'YES' ORDER BY labName ASC`,
      [deptId]
    );
    res.status(200).json(labs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Delete/Archive Lab
export const deleteLab = async (req, res) => {
  const { labId } = req.params;
  try {
    // Soft delete
    await pool.execute(`UPDATE LabRooms SET isActive='NO' WHERE labId = ?`, [labId]);
    res.status(200).json({ message: "Lab Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Check Lab Availability (Used by LabTimetable.jsx)
export const getAvailableLabsForSlot = async (req, res) => {
  const { day, period, deptId } = req.query;

  try {
    // Find labs in this department that are NOT in the Timetable for this specific day/period
    const query = `
      SELECT * FROM LabRooms 
      WHERE Deptid = ? 
      AND isActive = 'YES'
      AND labId NOT IN (
        SELECT DISTINCT labId 
        FROM Timetable 
        WHERE dayOfWeek = ? 
        AND periodNumber = ? 
        AND isActive = 'YES' 
        AND labId IS NOT NULL
      )
    `;

    const [availableLabs] = await pool.execute(query, [deptId, day, period]);
    res.status(200).json(availableLabs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getLabAllocationsForSlot = async (req, res) => {
  const { day, period, deptId } = req.query;

  try {
    // 1. Get ALL labs for the department
    // 2. LEFT JOIN with Timetable for that specific Day & Period
    // This allows us to see WHICH course is occupying the lab (if any)
    const query = `
      SELECT 
        l.labId, 
        l.labName, 
        l.capacity, 
        t.timetableId,
        c.courseCode,
        c.courseTitle,
        s.sectionName,
        u.username as staffName
      FROM LabRooms l
      LEFT JOIN Timetable t 
        ON l.labId = t.labId 
        AND t.dayOfWeek = ? 
        AND t.periodNumber = ? 
        AND t.isActive = 'YES'
      LEFT JOIN Course c ON t.courseId = c.courseId
      LEFT JOIN Section s ON t.sectionId = s.sectionId
      LEFT JOIN users u ON t.createdBy = u.email
      WHERE l.Deptid = ? 
      AND l.isActive = 'YES'
      ORDER BY l.labName ASC
    `;

    const [labsStatus] = await pool.execute(query, [day, period, deptId]);
    
    // Result example:
    // [
    //   { labId: 1, labName: "Comp Lab 1", courseCode: NULL ... } -> FREE
    //   { labId: 2, labName: "Comp Lab 2", courseCode: "CS101" ... } -> OCCUPIED
    // ]
    
    res.status(200).json(labsStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};