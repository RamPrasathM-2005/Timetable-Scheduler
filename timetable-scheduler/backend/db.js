import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: "./config.env" });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  charset: "utf8mb4",
  collation: "utf8mb4_unicode_ci",
  multipleStatements: true,
});

// Branch to Department ID mapping
export const branchMap = {
  CSE: { Deptid: 1, Deptname: "Computer Science Engineering" },
  IT: { Deptid: 4, Deptname: "Information Technology" },
  ECE: { Deptid: 2, Deptname: "Electronics & Communication" },
  MECH: { Deptid: 3, Deptname: "Mechanical Engineering" },
  CIVIL: { Deptid: 7, Deptname: "Civil Engineering" },
  EEE: { Deptid: 5, Deptname: "Electrical Engineering" },
};

const initDatabase = async () => {
  let connection;
  try {
    // Ensure database exists
    const admin = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    });
    await admin.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``
    );
    await admin.end();

    // Get a connection from the pool and start a transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1) Department
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS department (
                Deptid INT PRIMARY KEY,
                Deptname VARCHAR(100) NOT NULL,
                Deptacronym VARCHAR(10) NOT NULL
            )
        `);

    // 2) Regulation
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Regulation (
                regulationId INT PRIMARY KEY AUTO_INCREMENT,
                Deptid INT NOT NULL,
                regulationYear INT NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_regulation_dept FOREIGN KEY (Deptid) REFERENCES department(Deptid) ON DELETE RESTRICT,
                UNIQUE (Deptid, regulationYear)
            )
        `);

    // 3) Users
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                Userid INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('Student', 'Staff', 'Admin') NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                staffId INT UNIQUE,
                Deptid INT NOT NULL,
                image VARCHAR(500) DEFAULT '/Uploads/default.jpg',
                resetPasswordToken VARCHAR(255),
                resetPasswordExpires DATETIME,
                skillrackProfile VARCHAR(255),
                Created_by INT,
                Updated_by INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_department FOREIGN KEY (Deptid) REFERENCES department(Deptid) ON DELETE RESTRICT,
                CONSTRAINT fk_user_createdby FOREIGN KEY (Created_by) REFERENCES users(Userid) ON DELETE SET NULL,
                CONSTRAINT fk_user_updatedby FOREIGN KEY (Updated_by) REFERENCES users(Userid) ON DELETE SET NULL
            )
        `);

    // 4) Student Details
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_details (
                id INT PRIMARY KEY AUTO_INCREMENT,
                Userid INT NOT NULL,
                regno VARCHAR(50) UNIQUE NOT NULL,
                Deptid INT NOT NULL,
                batch INT,
                Semester VARCHAR(255),
                staffId INT,
                Created_by INT,
                Updated_by INT,
                date_of_joining DATE,
                date_of_birth DATE,
                blood_group ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'),
                tutorEmail VARCHAR(255),
                personal_email VARCHAR(255),
                first_graduate ENUM('Yes', 'No'),
                aadhar_card_no VARCHAR(12) UNIQUE,
                student_type ENUM('Day-Scholar', 'Hosteller'),
                mother_tongue VARCHAR(255),
                identification_mark VARCHAR(255),
                extracurricularID INT,
                religion ENUM('Hindu', 'Muslim', 'Christian', 'Others'),
                caste VARCHAR(255),
                community ENUM('General', 'OBC', 'SC', 'ST', 'Others'),
                gender ENUM('Male', 'Female', 'Transgender'),
                seat_type ENUM('Counselling', 'Management'),
                section VARCHAR(255),
                door_no VARCHAR(255),
                street VARCHAR(255),
                cityID INT,
                districtID INT,
                stateID INT,
                countryID INT,
                pincode VARCHAR(6),
                personal_phone VARCHAR(10),
                pending BOOLEAN DEFAULT TRUE,
                tutor_approval_status BOOLEAN DEFAULT FALSE,
                Approved_by INT,
                approved_at DATETIME,
                messages JSON,
                skillrackProfile VARCHAR(255),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_student_details_user FOREIGN KEY (Userid) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_student_details_dept FOREIGN KEY (Deptid) REFERENCES department(Deptid)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_student_details_tutor FOREIGN KEY (staffId) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_student_details_created FOREIGN KEY (Created_by) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_student_details_updated FOREIGN KEY (Updated_by) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_student_details_approved FOREIGN KEY (Approved_by) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE SET NULL
            )
        `);

    // 5) Batch
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Batch (
                batchId INT PRIMARY KEY AUTO_INCREMENT,
                degree VARCHAR(50) NOT NULL,
                branch VARCHAR(100) NOT NULL,
                batch VARCHAR(4) NOT NULL,
                batchYears VARCHAR(20) NOT NULL,
                regulationId INT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_batch (degree, branch, batch),
                CONSTRAINT fk_batch_regulation FOREIGN KEY (regulationId) REFERENCES Regulation(regulationId) ON DELETE SET NULL
            )
        `);

    // 6) Semester
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Semester (
                semesterId INT PRIMARY KEY AUTO_INCREMENT,
                batchId INT NOT NULL,
                semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
                startDate DATE NOT NULL,
                endDate DATE NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_sem_batch FOREIGN KEY (batchId) REFERENCES Batch(batchId)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
                UNIQUE (batchId, semesterNumber)
            )
        `);

    // 7) Course
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Course (
                courseId INT PRIMARY KEY AUTO_INCREMENT,
                courseCode VARCHAR(20) NOT NULL,
                semesterId INT NOT NULL,
                courseTitle VARCHAR(255) NOT NULL,
                category ENUM('HSMC','BSC','ESC','PEC','OEC','EEC','PCC', 'MC') NOT NULL,
                type ENUM('THEORY','INTEGRATED','PRACTICAL','EXPERIENTIAL LEARNING') NOT NULL,
                lectureHours INT DEFAULT 0,
                tutorialHours INT DEFAULT 0,
                practicalHours INT DEFAULT 0,
                experientialHours INT DEFAULT 0,
                totalContactPeriods INT NOT NULL,
                credits INT NOT NULL,
                minMark INT NOT NULL,
                maxMark INT NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(100),
                updatedBy VARCHAR(100),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_course_sem FOREIGN KEY (semesterId) REFERENCES Semester(semesterId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                UNIQUE (courseCode, semesterId)
            )
        `);

    // 8) RegulationCourse
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS RegulationCourse (
                regCourseId INT PRIMARY KEY AUTO_INCREMENT,
                regulationId INT NOT NULL,
                semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
                courseCode VARCHAR(20) NOT NULL,
                courseTitle VARCHAR(255) NOT NULL,
                category ENUM('HSMC','BSC','ESC','PEC','OEC','EEC','PCC') NOT NULL,
                type ENUM('THEORY','INTEGRATED','PRACTICAL','EXPERIENTIAL LEARNING') NOT NULL,
                lectureHours INT DEFAULT 0,
                tutorialHours INT DEFAULT 0,
                practicalHours INT DEFAULT 0,
                experientialHours INT DEFAULT 0,
                totalContactPeriods INT NOT NULL,
                credits INT NOT NULL,
                minMark INT NOT NULL,
                maxMark INT NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(100),
                updatedBy VARCHAR(100),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (regulationId, courseCode, semesterNumber),
                CONSTRAINT fk_regcourse_reg FOREIGN KEY (regulationId) REFERENCES Regulation(regulationId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 9) Vertical
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Vertical (
                verticalId INT PRIMARY KEY AUTO_INCREMENT,
                regulationId INT NOT NULL,
                verticalName VARCHAR(100) NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_vertical_regulation FOREIGN KEY (regulationId) REFERENCES Regulation(regulationId) ON DELETE CASCADE,
                UNIQUE (regulationId, verticalName)
            )
        `);

    // 10) VerticalCourse
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS VerticalCourse (
                verticalCourseId INT PRIMARY KEY AUTO_INCREMENT,
                verticalId INT NOT NULL,
                regCourseId INT NOT NULL,
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_vc_vertical FOREIGN KEY (verticalId) REFERENCES Vertical(verticalId) ON DELETE CASCADE,
                CONSTRAINT fk_vc_regcourse FOREIGN KEY (regCourseId) REFERENCES RegulationCourse(regCourseId) ON DELETE CASCADE,
                UNIQUE (verticalId, regCourseId)
            )
        `);

    // 11) Section
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Section (
                sectionId INT PRIMARY KEY AUTO_INCREMENT,
                courseId INT NOT NULL,
                sectionName VARCHAR(10) NOT NULL,
                capacity INT NOT NULL DEFAULT 40 CHECK (capacity > 0),
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_section_course FOREIGN KEY (courseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
                UNIQUE (courseId, sectionName)
            )
        `);

    // 12) StudentCourse
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StudentCourse (
                studentCourseId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                courseId INT NOT NULL,
                sectionId INT NOT NULL,
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (regno, courseId, sectionId),
                CONSTRAINT fk_sc_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_sc_course FOREIGN KEY (courseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_sc_section FOREIGN KEY (sectionId) REFERENCES Section(sectionId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 13) StaffCourse
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StaffCourse (
                staffCourseId INT PRIMARY KEY AUTO_INCREMENT,
                Userid INT NOT NULL,
                courseId INT NOT NULL,
                sectionId INT NOT NULL,
                Deptid INT NOT NULL,
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (Userid, courseId, sectionId, Deptid),
                CONSTRAINT fk_stc_staff FOREIGN KEY (Userid) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_stc_dept FOREIGN KEY (Deptid) REFERENCES department(Deptid)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_stc_course FOREIGN KEY (courseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_stc_section FOREIGN KEY (sectionId) REFERENCES Section(sectionId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 14) CourseOutcome
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS CourseOutcome (
                coId INT PRIMARY KEY AUTO_INCREMENT,
                courseId INT NOT NULL,
                coNumber VARCHAR(10) NOT NULL,
                UNIQUE (courseId, coNumber),
                CONSTRAINT fk_co_course FOREIGN KEY (courseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 15) COTool
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS COTool (
                toolId INT PRIMARY KEY AUTO_INCREMENT,
                coId INT NOT NULL,
                toolName VARCHAR(100) NOT NULL,
                weightage INT NOT NULL CHECK (weightage BETWEEN 0 AND 100),
                UNIQUE (coId, toolName),
                CONSTRAINT fk_tool_co FOREIGN KEY (coId) REFERENCES CourseOutcome(coId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 16) StudentCOTool
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StudentCOTool (
                studentToolId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                toolId INT NOT NULL,
                marksObtained INT NOT NULL CHECK (marksObtained >= 0),
                UNIQUE (regno, toolId),
                CONSTRAINT fk_sct_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_sct_tool FOREIGN KEY (toolId) REFERENCES COTool(toolId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 17) LabRooms (Crucial: Define before Timetable)
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS LabRooms (
                labId INT PRIMARY KEY AUTO_INCREMENT,
                labName VARCHAR(100) NOT NULL,
                capacity INT DEFAULT 60,
                Deptid INT NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(labName, Deptid),
                CONSTRAINT fk_lab_dept FOREIGN KEY (Deptid) REFERENCES department(Deptid) ON DELETE CASCADE
            )
        `);

    // 18) Timetable (Updated: Removed restrictive unique constraint to allow parallel batches)
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS Timetable (
                timetableId INT PRIMARY KEY AUTO_INCREMENT,
                courseId INT NOT NULL,
                sectionId INT NULL,
                labId INT NULL,
                dayOfWeek ENUM('MON','TUE','WED','THU','FRI','SAT') NOT NULL,
                periodNumber INT NOT NULL CHECK (periodNumber BETWEEN 1 AND 8),
                Deptid INT NOT NULL,
                semesterId INT NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_tt_dept FOREIGN KEY (Deptid) REFERENCES department(Deptid)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_tt_sem FOREIGN KEY (semesterId) REFERENCES Semester(semesterId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_tt_course FOREIGN KEY (courseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_tt_section FOREIGN KEY (sectionId) REFERENCES Section(sectionId)
                    ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_tt_lab FOREIGN KEY (labId) REFERENCES LabRooms(labId)
                    ON UPDATE CASCADE ON DELETE SET NULL,
                
                -- ALLOWS: Same course/semester at the same time (parallel labs)
                -- PREVENTS: Overlapping sections and Double-booked labs
                UNIQUE (semesterId, dayOfWeek, periodNumber, sectionId), 
                UNIQUE (labId, dayOfWeek, periodNumber) 
            )
        `);

    // 19) DayAttendance
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS DayAttendance (
                dayAttendanceId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
                attendanceDate DATE NOT NULL,
                status ENUM('P','A') NOT NULL,
                UNIQUE (regno, attendanceDate),
                CONSTRAINT fk_da_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 20) PeriodAttendance
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS PeriodAttendance (
                periodAttendanceId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                staffId INT NOT NULL,
                courseId INT NOT NULL,
                sectionId INT NOT NULL,
                semesterNumber INT NOT NULL CHECK (semesterNumber BETWEEN 1 AND 8),
                dayOfWeek ENUM('MON','TUE','WED','THU','FRI','SAT') NOT NULL,
                periodNumber INT NOT NULL CHECK (periodNumber BETWEEN 1 AND 8),
                attendanceDate DATE NOT NULL,
                status ENUM('P','A','OD') NOT NULL,
                Deptid INT NOT NULL,
                updatedBy VARCHAR(150) NOT NULL,
                UNIQUE (regno, courseId, sectionId, attendanceDate, periodNumber),
                CONSTRAINT fk_pa_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_pa_staff FOREIGN KEY (staffId) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_pa_dept FOREIGN KEY (Deptid) REFERENCES department(Deptid)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_pa_course FOREIGN KEY (courseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_pa_section FOREIGN KEY (sectionId) REFERENCES Section(sectionId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 21) CoursePartitions
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS CoursePartitions (
                partitionId INT PRIMARY KEY AUTO_INCREMENT,
                courseId INT NOT NULL UNIQUE,
                theoryCount INT DEFAULT 0,
                practicalCount INT DEFAULT 0,
                experientialCount INT DEFAULT 0,
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_partition_course FOREIGN KEY (courseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 22) COType
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS COType (
                coTypeId INT PRIMARY KEY AUTO_INCREMENT,
                coId INT NOT NULL UNIQUE,
                coType ENUM('THEORY', 'PRACTICAL', 'EXPERIENTIAL') NOT NULL,
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_cotype_co FOREIGN KEY (coId) REFERENCES CourseOutcome(coId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 23) ToolDetails
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS ToolDetails (
                toolDetailId INT PRIMARY KEY AUTO_INCREMENT,
                toolId INT NOT NULL UNIQUE,
                maxMarks INT NOT NULL CHECK (maxMarks > 0),
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_tooldetail_tool FOREIGN KEY (toolId) REFERENCES COTool(toolId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 24) ElectiveBucket
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS ElectiveBucket (
                bucketId INT PRIMARY KEY AUTO_INCREMENT,
                semesterId INT NOT NULL,
                bucketNumber INT NOT NULL,
                bucketName VARCHAR(100) NOT NULL,
                createdBy INT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (semesterId, bucketNumber),
                CONSTRAINT fk_bucket_sem FOREIGN KEY (semesterId) REFERENCES Semester(semesterId) ON DELETE CASCADE,
                CONSTRAINT fk_bucket_created FOREIGN KEY (createdBy) REFERENCES users(Userid) ON DELETE SET NULL
            )
        `);

    // 25) ElectiveBucketCourse
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS ElectiveBucketCourse (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bucketId INT NOT NULL,
                courseId INT NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (bucketId, courseId),
                CONSTRAINT fk_ebc_bucket FOREIGN KEY (bucketId) REFERENCES ElectiveBucket(bucketId) ON DELETE CASCADE,
                CONSTRAINT fk_ebc_course FOREIGN KEY (courseId) REFERENCES Course(courseId) ON DELETE CASCADE
            )
        `);

    // 26) StudentCOMarks
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StudentCOMarks (
                studentCoMarkId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                coId INT NOT NULL,
                consolidatedMark DECIMAL(5,2) NOT NULL CHECK (consolidatedMark >= 0 AND consolidatedMark <= 100),
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (regno, coId),
                CONSTRAINT fk_scm_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_scm_co FOREIGN KEY (coId) REFERENCES CourseOutcome(coId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 27) StudentElectiveSelection
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StudentElectiveSelection (
                selectionId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                bucketId INT NOT NULL,
                selectedCourseId INT NOT NULL,
                status ENUM('pending', 'allocated', 'rejected') DEFAULT 'pending',
                createdBy INT,
                updatedBy INT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (regno, bucketId),
                CONSTRAINT fk_ses_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_ses_bucket FOREIGN KEY (bucketId) REFERENCES ElectiveBucket(bucketId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_ses_course FOREIGN KEY (selectedCourseId) REFERENCES Course(courseId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_ses_created FOREIGN KEY (createdBy) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_ses_updated FOREIGN KEY (updatedBy) REFERENCES users(Userid)
                    ON UPDATE CASCADE ON DELETE SET NULL
            )
        `);

    // 28) NptelCourse
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS NptelCourse (
                nptelCourseId INT PRIMARY KEY AUTO_INCREMENT,
                courseTitle VARCHAR(255) NOT NULL,
                courseCode VARCHAR(50) NOT NULL,
                type ENUM('OEC', 'PEC') NOT NULL,
                credits INT NOT NULL CHECK (credits > 0),
                semesterId INT NOT NULL,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_nptel_semester FOREIGN KEY (semesterId) REFERENCES Semester(semesterId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                UNIQUE KEY uq_nptel_code_semester (courseCode, semesterId),
                INDEX idx_nptel_semester (semesterId),
                INDEX idx_nptel_code (courseCode)
            )
        `);

    // 29) StudentNptelEnrollment
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StudentNptelEnrollment (
                enrollmentId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                nptelCourseId INT NOT NULL,
                semesterId INT NOT NULL,
                enrolledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                isActive ENUM('YES','NO') DEFAULT 'YES',
                CONSTRAINT fk_snptel_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_snptel_course FOREIGN KEY (nptelCourseId) REFERENCES NptelCourse(nptelCourseId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_snptel_semester FOREIGN KEY (semesterId) REFERENCES Semester(semesterId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                UNIQUE KEY uq_student_nptel (regno, nptelCourseId),
                INDEX idx_regno (regno),
                INDEX idx_nptel (nptelCourseId)
            )
        `);

    // 30) NptelCreditTransfer
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS NptelCreditTransfer (
                transferId INT PRIMARY KEY AUTO_INCREMENT,
                enrollmentId INT NOT NULL,
                regno VARCHAR(50) NOT NULL,
                nptelCourseId INT NOT NULL,
                grade ENUM('O','A+','A','B+','B','U') NOT NULL,
                requestedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                studentStatus ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                studentRespondedAt TIMESTAMP NULL DEFAULT NULL,
                studentRemarks VARCHAR(500) NULL,
                CONSTRAINT fk_transfer_enrollment FOREIGN KEY (enrollmentId) REFERENCES StudentNptelEnrollment(enrollmentId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_transfer_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_transfer_nptel FOREIGN KEY (nptelCourseId) REFERENCES NptelCourse(nptelCourseId)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                UNIQUE KEY uq_enrollment_transfer (enrollmentId)
            )
        `);

    // Seeding logic for departments
    await connection.execute(`
            INSERT IGNORE INTO department (Deptid, Deptname, Deptacronym)
            VALUES
            (1, 'Computer Science Engineering', 'CSE'),
            (2, 'Electronics & Communication', 'ECE'),
            (3, 'Mechanical Engineering', 'MECH'),
            (4, 'Information Technology', 'IT'),
            (5, 'Electrical Engineering', 'EEE'),
            (6, 'Artificial Intelligence and Data Science', 'AIDS'),
            (7, 'Civil Engineering', 'CIVIL')
        `);

    // 31) GradePoint
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS GradePoint (
                grade ENUM('O','A+','A','B+','B','U') PRIMARY KEY,
                point TINYINT NOT NULL
            )
        `);

    await connection.execute(`
            INSERT IGNORE INTO GradePoint (grade, point) VALUES
                ('O',10),('A+',9),('A',8),('B+',7),('B',6),('U',0)
        `);

    // 32) StudentGrade
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StudentGrade (
                gradeId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                courseCode VARCHAR(20) NOT NULL,
                grade ENUM('O','A+','A','B+','B','U') NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_regno_course (regno, courseCode),
                CONSTRAINT fk_sg_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                INDEX idx_regno (regno),
                INDEX idx_courseCode (courseCode)
            )
        `);

    // Triggers for course code validation
    await connection.query(`DROP TRIGGER IF EXISTS trg_studentgrade_insert_before`);
    await connection.query(`
            CREATE TRIGGER trg_studentgrade_insert_before
            BEFORE INSERT ON StudentGrade
            FOR EACH ROW
            BEGIN
              DECLARE valid_regular INT DEFAULT 0;
              DECLARE valid_nptel INT DEFAULT 0;
              SELECT COUNT(*) INTO valid_regular FROM Course WHERE courseCode = NEW.courseCode AND isActive = 'YES';
              SELECT COUNT(*) INTO valid_nptel FROM NptelCourse WHERE courseCode = NEW.courseCode AND isActive = 'YES';
              IF valid_regular = 0 AND valid_nptel = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid courseCode: Not found in regular courses or NPTEL courses';
              END IF;
            END
        `);

    await connection.query(`DROP TRIGGER IF EXISTS trg_studentgrade_update_before`);
    await connection.query(`
            CREATE TRIGGER trg_studentgrade_update_before
            BEFORE UPDATE ON StudentGrade
            FOR EACH ROW
            BEGIN
              DECLARE valid_regular INT DEFAULT 0;
              DECLARE valid_nptel INT DEFAULT 0;
              SELECT COUNT(*) INTO valid_regular FROM Course WHERE courseCode = NEW.courseCode AND isActive = 'YES';
              SELECT COUNT(*) INTO valid_nptel FROM NptelCourse WHERE courseCode = NEW.courseCode AND isActive = 'YES';
              IF valid_regular = 0 AND valid_nptel = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid courseCode: Not found in regular courses or NPTEL courses';
              END IF;
            END
        `);

    // 33) StudentSemesterGPA
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS StudentSemesterGPA (
                studentGPAId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(50) NOT NULL,
                semesterId INT NOT NULL,
                gpa DECIMAL(4,2) NULL,
                cgpa DECIMAL(4,2) NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE (regno, semesterId),
                CONSTRAINT fk_ssg_student FOREIGN KEY (regno) REFERENCES student_details(regno)
                    ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_ssg_semester FOREIGN KEY (semesterId) REFERENCES Semester(semesterId)
                    ON UPDATE CASCADE ON DELETE CASCADE
            )
        `);

    // 34) CourseRequest
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS CourseRequest (
                requestId INT PRIMARY KEY AUTO_INCREMENT,
                staffId INT NOT NULL,
                courseId INT NOT NULL,
                status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') DEFAULT 'PENDING',  
                requestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                approvedAt DATETIME NULL,
                rejectedAt DATETIME NULL,
                withdrawnAt DATETIME NULL,
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_request (staffId, courseId),
                CONSTRAINT fk_request_staff FOREIGN KEY (staffId) REFERENCES users(Userid) ON DELETE CASCADE,
                CONSTRAINT fk_request_course FOREIGN KEY (courseId) REFERENCES Course(courseId) ON DELETE CASCADE
            );
        `);

    // 35) CBCS
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS CBCS (
                cbcs_id INT PRIMARY KEY AUTO_INCREMENT,
                batchId INT NOT NULL,
                Deptid INT NOT NULL,
                semesterId INT NOT NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'FCFS',
                allocation_excel_path VARCHAR(255),
                total_students INT DEFAULT 0,
                complete ENUM('YES','NO') DEFAULT 'NO',
                isActive ENUM('YES','NO') DEFAULT 'YES',
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_cbcs_batch FOREIGN KEY (batchId) REFERENCES Batch(batchId) ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_cbcs_dept FOREIGN KEY (Deptid) REFERENCES department(Deptid) ON UPDATE CASCADE ON DELETE RESTRICT,
                CONSTRAINT fk_cbcs_semester FOREIGN KEY (semesterId) REFERENCES Semester(semesterId) ON UPDATE CASCADE ON DELETE RESTRICT
            );
        `);

    // 36) CBCS Subjects
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS CBCS_Subject (
                cbcs_subject_id INT PRIMARY KEY AUTO_INCREMENT,
                cbcs_id INT NOT NULL,
                courseId INT NOT NULL,
                courseCode VARCHAR(50),
                courseTitle VARCHAR(255),
                category VARCHAR(50),
                type VARCHAR(50),
                credits INT,
                bucketName VARCHAR(100),
                CONSTRAINT fk_cbcs_subject_cbcs FOREIGN KEY (cbcs_id) REFERENCES CBCS(cbcs_id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_cbcs_subject_course FOREIGN KEY (courseId) REFERENCES Course(courseId) ON DELETE RESTRICT ON UPDATE CASCADE
            );
        `);

    // 37) CBCS Section Staff
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS CBCS_Section_Staff (
                id INT PRIMARY KEY AUTO_INCREMENT,
                cbcs_subject_id INT NOT NULL,
                sectionId INT NOT NULL,
                staffId INT,
                student_count INT DEFAULT 0,
                CONSTRAINT fk_cbcs_section_subject FOREIGN KEY (cbcs_subject_id) REFERENCES CBCS_Subject(cbcs_subject_id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_cbcs_section_section FOREIGN KEY (sectionId) REFERENCES Section(sectionId) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_cbcs_section_staff FOREIGN KEY (staffId) REFERENCES users(Userid) ON DELETE SET NULL ON UPDATE CASCADE
            );
        `);

    // 38) Student Choices
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS studentcourse_choices (
                choiceId INT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(20) NOT NULL,
                cbcs_id INT NOT NULL,
                courseId INT NOT NULL,
                staffId INT NOT NULL,
                sectionId INT NOT NULL,
                preferenceOrder INT NOT NULL,
                createdBy VARCHAR(150),
                updatedBy VARCHAR(150),
                createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_choice_cbcs FOREIGN KEY (cbcs_id) REFERENCES CBCS(cbcs_id) ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_choice_course FOREIGN KEY (courseId) REFERENCES Course(courseId) ON UPDATE CASCADE ON DELETE CASCADE,
                CONSTRAINT fk_choice_student FOREIGN KEY (regno) REFERENCES student_details(regno) ON UPDATE CASCADE ON DELETE CASCADE,
                UNIQUE KEY uq_student_course_choice (regno, courseId, cbcs_id)
            );
        `);

    // 39) Student Temp Choice
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_temp_choice (
                choiceId BIGINT PRIMARY KEY AUTO_INCREMENT,
                regno VARCHAR(20) NOT NULL,
                cbcs_id INT NOT NULL,
                courseId INT NOT NULL,
                preferred_sectionId INT NOT NULL,
                preferred_staffId INT NOT NULL,
                preference_order INT NOT NULL,
                status ENUM('PENDING', 'PROCESSED', 'REJECTED') DEFAULT 'PENDING',
                submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                processedAt DATETIME NULL,
                createdBy VARCHAR(150) NULL,
                updatedBy VARCHAR(150) NULL,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_choice (regno, cbcs_id, courseId),
                CONSTRAINT fk_temp_regno FOREIGN KEY (regno) REFERENCES student_details(regno) ON DELETE CASCADE,
                CONSTRAINT fk_temp_cbcs FOREIGN KEY (cbcs_id) REFERENCES CBCS(cbcs_id) ON DELETE CASCADE,
                CONSTRAINT fk_temp_course FOREIGN KEY (courseId) REFERENCES Course(courseId) ON DELETE CASCADE,
                CONSTRAINT fk_temp_section FOREIGN KEY (preferred_sectionId) REFERENCES Section(sectionId) ON DELETE CASCADE,
                CONSTRAINT fk_temp_staff FOREIGN KEY (preferred_staffId) REFERENCES users(Userid) ON DELETE CASCADE
            );
        `);

    // Seeding default Regulations and Verticals
    const [depts] = await connection.execute("SELECT Deptid FROM department");
    const regulationYears = [2023, 2019, 2015];
    const defaultVerticals = ["AI", "Data Science", "Cybersecurity", "Cloud Computing"];

    for (const row of depts) {
      for (const year of regulationYears) {
        const [regResult] = await connection.execute(
          `INSERT IGNORE INTO Regulation (Deptid, regulationYear, createdBy, updatedBy) VALUES (?, ?, 'admin', 'admin')`,
          [row.Deptid, year]
        );
        const regulationId = regResult.insertId;
        if (regulationId) {
          for (const verticalName of defaultVerticals) {
            await connection.execute(
              `INSERT IGNORE INTO Vertical (regulationId, verticalName, createdBy, updatedBy) VALUES (?, ?, 'admin', 'admin')`,
              [regulationId, verticalName]
            );
          }
        }
      }
    }

    await connection.commit();
    console.log("✅ Database fully initialized with LabRooms and updated Timetable logic.");
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ DB Initialization Error:", err);
  } finally {
    if (connection) connection.release();
  }
};

initDatabase();

export default pool;

/**
 * Analytical utility to fetch attendance report
 */
export const getCourseWiseAttendance = async ({
  deptId,
  batch,
  semesterId,
  fromDate,
  toDate,
}) => {
  try {
    const [students] = await pool.execute(
      `SELECT s.regno AS RegisterNumber, u.username AS StudentName
       FROM student_details s
       JOIN users u ON s.Userid = u.Userid
       WHERE s.batch = ? AND s.Deptid = ? AND u.status = 'active'`,
      [batch, deptId]
    );

    if (!students.length) return { success: true, report: [] };

    const [attendanceRows] = await pool.execute(
      `SELECT a.regno, c.courseCode AS CourseCode,
              COUNT(*) AS ConductedPeriods,
              SUM(CASE WHEN a.status='P' THEN 1 ELSE 0 END) AS AttendedPeriods
       FROM PeriodAttendance a
       JOIN Course c ON a.courseId = c.courseId
       JOIN student_details s ON a.regno = s.regno
       WHERE s.batch = ? AND s.Deptid = ? AND c.semesterId = ?
         AND a.attendanceDate BETWEEN ? AND ?
         AND c.isActive = 'YES' AND a.isActive = 'YES'
       GROUP BY a.regno, c.courseCode`,
      [batch, deptId, semesterId, fromDate, toDate]
    );

    const studentMap = {};
    students.forEach((s) => {
      studentMap[s.RegisterNumber] = { ...s, Courses: {} };
    });

    attendanceRows.forEach((row) => {
      if (studentMap[row.regno]) {
        studentMap[row.regno].Courses[row.CourseCode] = {
          CourseCode: row.CourseCode,
          ConductedPeriods: row.ConductedPeriods,
          AttendedPeriods: row.AttendedPeriods,
        };
      }
    });

    return { success: true, report: Object.values(studentMap) };
  } catch (error) {
    console.error("Error in getCourseWiseAttendance:", error);
    return { success: false, error: error.message };
  }
};