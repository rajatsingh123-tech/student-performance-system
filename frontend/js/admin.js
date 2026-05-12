// Admin Dashboard JavaScript
const API_URL = 'https://student-performance-system-44as.onrender.com/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Check authentication
if (!token || user.role !== 'admin') {
    window.location.href = 'login.html';
}

// Display admin name
document.getElementById('adminName').textContent = `Welcome, ${user.name}`;

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const stats = await response.json();
        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('totalTeachers').textContent = stats.totalTeachers;
        document.getElementById('totalScores').textContent = stats.totalScores;
        document.getElementById('totalAttendance').textContent = stats.totalAttendance;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const users = await response.json();
        const usersBody = document.getElementById('usersBody');
        usersBody.innerHTML = '';
        
        users.forEach(user => {
            const row = usersBody.insertRow();
            row.insertCell(0).textContent = user.name;
            row.insertCell(1).textContent = user.email;
            row.insertCell(2).innerHTML = `<span class="role-badge ${user.role}">${user.role}</span>`;
            row.insertCell(3).textContent = user.studentId || '-';
            row.insertCell(3).innerHTML = `
                <button onclick="editUser('${user._id}')" class="btn-small">Edit</button>
                <button onclick="deleteUser('${user._id}')" class="btn-small btn-danger">Delete</button>
            `;
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Create user form
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        password: document.getElementById('userPassword').value,
        role: document.getElementById('userRole').value,
        studentId: document.getElementById('userStudentId').value || undefined,
        class: document.getElementById('userClass').value || undefined
    };
    
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            alert('User created successfully!');
            document.getElementById('createUserForm').reset();
            loadUsers();
            loadStats();
        } else {
            const error = await response.json();
            alert(error.message || 'Error creating user');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error connecting to server');
    }
});

// Edit user
async function editUser(userId) {
    const newName = prompt('Enter new name:');
    if (newName) {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            });
            
            if (response.ok) {
                alert('User updated successfully!');
                loadUsers();
            } else {
                alert('Error updating user');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// Delete user
async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('User deleted successfully!');
                loadUsers();
                loadStats();
            } else {
                alert('Error deleting user');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Load all data
loadStats();
loadUsers();