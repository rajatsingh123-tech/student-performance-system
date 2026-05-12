// Student Dashboard JavaScript
const API_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!token || user.role !== 'student') {
    window.location.href = 'login.html';
}

// Display student name
document.getElementById('studentName').textContent = `Welcome, ${user.name}`;

let performanceChart = null;

// Load all data
async function loadDashboard() {
    await loadScores();
    await loadAttendance();
    await loadWeeklyReports();
    await loadPerformanceChart();
}

// Load scores
async function loadScores() {
    try {
        const response = await fetch(`${API_URL}/student/scores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const scores = await response.json();
        const scoresBody = document.getElementById('scoresBody');
        scoresBody.innerHTML = '';
        
        let totalMarks = 0;
        scores.forEach(score => {
            totalMarks += score.marks;
            const row = scoresBody.insertRow();
            row.insertCell(0).textContent = score.subject;
            row.insertCell(1).textContent = score.marks;
            row.insertCell(2).textContent = score.examType;
            row.insertCell(3).textContent = new Date(score.date).toLocaleDateString();
        });
        
        const avgScore = scores.length > 0 ? (totalMarks / scores.length).toFixed(2) : 0;
        document.getElementById('avgScore').textContent = `${avgScore}%`;
        document.getElementById('subjectsCount').textContent = scores.length;
    } catch (error) {
        console.error('Error loading scores:', error);
    }
}

// Load attendance
async function loadAttendance() {
    try {
        const response = await fetch(`${API_URL}/student/attendance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        const attendanceBody = document.getElementById('attendanceBody');
        attendanceBody.innerHTML = '';
        
        data.records.forEach(record => {
            const row = attendanceBody.insertRow();
            row.insertCell(0).textContent = new Date(record.date).toLocaleDateString();
            row.insertCell(1).textContent = record.subject;
            row.insertCell(2).innerHTML = record.status === 'present' ? '✅ Present' : 
                                           record.status === 'late' ? '⏰ Late' : '❌ Absent';
        });
        
        document.getElementById('attendancePercent').textContent = `${data.summary.percentage}%`;
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

// Load weekly reports
async function loadWeeklyReports() {
    try {
        const response = await fetch(`${API_URL}/student/weekly-reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const reports = await response.json();
        const reportsContainer = document.getElementById('reportsContainer');
        reportsContainer.innerHTML = '';
        
        reports.forEach(report => {
            const reportCard = document.createElement('div');
            reportCard.className = 'report-card';
            reportCard.innerHTML = `
                <div class="report-header">
                    <strong>Week: ${new Date(report.weekStartDate).toLocaleDateString()} - ${new Date(report.weekEndDate).toLocaleDateString()}</strong>
                </div>
                <div class="report-content">
                    <p>📊 Average Score: ${report.averageScore.toFixed(2)}%</p>
                    <p>📅 Attendance: ${report.attendancePercentage.toFixed(2)}%</p>
                    <p>💡 Summary: ${report.performanceSummary}</p>
                    <p>🎯 Recommendations: ${report.recommendations.join(', ')}</p>
                </div>
            `;
            reportsContainer.appendChild(reportCard);
        });
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Load performance chart
async function loadPerformanceChart() {
    try {
        const response = await fetch(`${API_URL}/student/performance-chart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        const ctx = document.getElementById('performanceChart').getContext('2d');
        
        if (performanceChart) {
            performanceChart.destroy();
        }
        
        performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.subjects,
                datasets: [{
                    label: 'Subject-wise Performance',
                    data: data.data,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Marks (%)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Student Performance Analysis'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading chart:', error);
    }
}
// Add this function to refresh student data
async function refreshStudentData() {
    try {
        const response = await fetch(`${API_URL}/student/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            // Update student info in UI
            document.getElementById('studentName').textContent = `Welcome, ${data.student.name}`;
            // Update roll number if displayed anywhere
            if (document.getElementById('studentRollNo')) {
                document.getElementById('studentRollNo').textContent = data.student.rollNumber;
            }
        }
    } catch (error) {
        console.error('Error refreshing student data:', error);
    }
}

// Call this after any update

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Load dashboard on page load
loadDashboard();

// Auto-refresh every 30 seconds
setInterval(() => {
    loadScores();
    loadAttendance();
}, 30000);