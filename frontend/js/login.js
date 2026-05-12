// Login functionality
const API_URL = 'https://student-performance-system-44as.onrender.com/api';

// Get role from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');

// Display role
if (role) {
    const roleDisplay = document.getElementById('role-display');
    if (roleDisplay) {
        roleDisplay.innerHTML = `Logging in as: <strong>${role.toUpperCase()}</strong>`;
    }
}

// Handle login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;
        
        try {
            console.log('Attempting login with:', email);
            
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log('Server response:', data);
            
            if (response.ok && data.success) {
                // Store user data in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({
                    id: data._id,
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    studentId: data.studentId
                }));
                
                // Show success message
                alert(`Login successful! Welcome ${data.name}`);
                
                // Redirect based on role
                switch(data.role) {
                    case 'student':
                        window.location.href = 'student-dashboard.html';
                        break;
                    case 'teacher':
                        window.location.href = 'teacher-dashboard.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin-dashboard.html';
                        break;
                    default:
                        window.location.href = 'index.html';
                }
            } else {
                // Show error message
                alert(data.message || 'Login failed! Please check your credentials.');
                console.error('Login failed:', data);
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Error connecting to server. Please check your internet or wait for backend to wake up.');
        } finally {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}