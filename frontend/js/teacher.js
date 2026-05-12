// Teacher Dashboard JavaScript
const API_URL = 'https://student-performance-system-44as.onrender.com/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!token || user.role !== 'teacher') {
    window.location.href = 'login.html';
}

// Display teacher name
document.getElementById('teacherName').textContent = `Welcome, ${user.name}`;

// Load students list
async function loadStudents() {
    try {
        const response = await fetch(`${API_URL}/teacher/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const students = await response.json();
        
        // Populate all student select dropdowns
        const selects = ['studentId', 'attStudentId', 'reportStudentId'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Select Student</option>';
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student._id;
                option.textContent = `${student.name} (${student.studentId})`;
                select.appendChild(option);
            });
        });
        
        // Populate students table
        const studentsBody = document.getElementById('studentsBody');
        studentsBody.innerHTML = '';
        students.forEach(student => {
            const row = studentsBody.insertRow();
            row.insertCell(0).textContent = student.name;
            row.insertCell(1).textContent = student.studentId || 'N/A';
            row.insertCell(2).textContent = student.class || 'N/A';
            row.insertCell(3).textContent = student.email;
        });
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Add score
document.getElementById('scoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const scoreData = {
        studentId: document.getElementById('studentId').value,
        subject: document.getElementById('subject').value,
        marks: parseInt(document.getElementById('marks').value),
        examType: document.getElementById('examType').value
    };
    
    try {
        const response = await fetch(`${API_URL}/teacher/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(scoreData)
        });
        
        if (response.ok) {
            alert('Score added successfully!');
            document.getElementById('scoreForm').reset();
        } else {
            const error = await response.json();
            alert(error.message || 'Error adding score');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error connecting to server');
    }
});

// Mark attendance
document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const attendanceData = {
        studentId: document.getElementById('attStudentId').value,
        subject: document.getElementById('attSubject').value,
        status: document.getElementById('status').value,
        date: document.getElementById('attDate').value
    };
    
    try {
        const response = await fetch(`${API_URL}/teacher/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(attendanceData)
        });
        
        if (response.ok) {
            alert('Attendance marked successfully!');
            document.getElementById('attendanceForm').reset();
        } else {
            const error = await response.json();
            alert(error.message || 'Error marking attendance');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error connecting to server');
    }
});

// Generate weekly report
document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const reportData = {
        studentId: document.getElementById('reportStudentId').value,
        weekStartDate: document.getElementById('weekStart').value
    };
    
    try {
        const response = await fetch(`${API_URL}/teacher/generate-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
            const report = await response.json();
            alert(`Report generated!\nAverage Score: ${report.averageScore.toFixed(2)}%\nAttendance: ${report.attendancePercentage.toFixed(2)}%`);
            document.getElementById('reportForm').reset();
        } else {
            const error = await response.json();
            alert(error.message || 'Error generating report');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error connecting to server');
    }
});

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Set default date to today
document.getElementById('attDate').valueAsDate = new Date();
document.getElementById('weekStart').valueAsDate = new Date();

// Load students on page load
loadStudents();