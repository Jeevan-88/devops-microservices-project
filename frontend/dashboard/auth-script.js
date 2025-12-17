const API_URL = 'http://localhost/api';

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const message = document.getElementById('message');

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>Signing in...</span>';

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store tokens
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.user));

                showMessage('success', 'Login successful! Redirecting...');

                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 1500);
            } else {
                showMessage('error', data.error || 'Login failed');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Sign In</span>';
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Sign In</span>';
        }
    });
}

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const signupBtn = document.getElementById('signupBtn');
        const message = document.getElementById('message');

        if (password !== confirmPassword) {
            showMessage('error', 'Passwords do not match');
            return;
        }

        if (password.length < 8) {
            showMessage('error', 'Password must be at least 8 characters');
            return;
        }

        signupBtn.disabled = true;
        signupBtn.innerHTML = '<span>Creating account...</span>';

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store tokens
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('user', JSON.stringify(data.user));

                showMessage('success', 'Account created! Redirecting...');

                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 1500);
            } else {
                showMessage('error', data.error || 'Registration failed');
                signupBtn.disabled = false;
                signupBtn.innerHTML = '<span>Create Account</span>';
            }
        } catch (error) {
            showMessage('error', 'Network error. Please try again.');
            signupBtn.disabled = false;
            signupBtn.innerHTML = '<span>Create Account</span>';
        }
    });
}

// OAuth Login Functions
function loginWithGoogle() {
    alert('Google OAuth requires API credentials.\n\nTo enable:\n1. Get credentials from Google Cloud Console\n2. Add to docker-compose.yml:\n   GOOGLE_CLIENT_ID=your-id\n   GOOGLE_CLIENT_SECRET=your-secret\n3. Restart services\n\nFor now, use email/password signup!');
    // Uncomment when credentials are added:
    // window.location.href = `${API_URL}/auth/google`;
}

function loginWithFacebook() {
    alert('Facebook OAuth requires App credentials.\n\nTo enable:\n1. Create app at developers.facebook.com\n2. Add to docker-compose.yml:\n   FACEBOOK_APP_ID=your-id\n   FACEBOOK_APP_SECRET=your-secret\n3. Restart services\n\nFor now, use email/password signup!');
    // Uncomment when credentials are added:
    // window.location.href = `${API_URL}/auth/facebook`;
}

// Show message function
function showMessage(type, text) {
    const message = document.getElementById('message');
    message.className = `message ${type}`;
    message.textContent = text;
    message.style.display = 'block';
}

console.log('%c🔐 Auth System Ready', 'color: #6366f1; font-size: 14px; font-weight: bold;');
console.log('%cAPI Endpoint:', 'color: #8b5cf6;', API_URL);
