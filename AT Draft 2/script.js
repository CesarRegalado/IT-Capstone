// User database EX.
window.USER_DATABASE = {
    students: new Map(),
    instructors: new Map()
};

function initializeFormToggle() {
    const loginToggle = document.getElementById('login_toggle');
    const registerToggle = document.getElementById('register_toggle');
    const loginForm = document.getElementById('login_form');
    const registerForm = document.getElementById('register_form');
    
    const switchForms = (showLogin) => {
        loginToggle.classList.toggle('active', showLogin);
        registerToggle.classList.toggle('active', !showLogin);
        loginForm.classList.toggle('active', showLogin);
        registerForm.classList.toggle('active', !showLogin);
        loginForm.hidden = !showLogin;
        registerForm.hidden = showLogin;
        
        // Clear errors when switching forms
        document.querySelectorAll('.error_message').forEach(error => {
            error.style.display = 'none';
        });
        document.querySelectorAll('.form_group').forEach(group => {
            group.classList.remove('error');
        });
    };
    
    loginToggle.addEventListener('click', () => switchForms(true));
    registerToggle.addEventListener('click', () => switchForms(false));
}

function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

function initializePWAInstall() {
    const installBtn = document.getElementById('install_btn');
    let deferredPrompt;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'none';
        return;
    }

    // Show install button for ALL browsers by default
    installBtn.style.display = 'inline-flex';

    // Listen for the beforeinstallprompt event (Chrome/Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('PWA install prompt available');
        e.preventDefault();
        deferredPrompt = e;
        
        installBtn.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('User response to install prompt:', outcome);
                
                if (outcome === 'accepted') {
                    installBtn.style.display = 'none';
                    AuthUtils.showToast('App installed successfully!', 'success');
                }
                
                deferredPrompt = null;
            }
        };
    });

    // Hide install button if app is already installed
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        installBtn.style.display = 'none';
        deferredPrompt = null;
    });
}

function authenticateUser(email, password) {
    console.log('Authenticating:', email);
    console.log('Database contents:', Array.from(USER_DATABASE.students.keys()));
    
    for (const db of Object.values(USER_DATABASE)) {
        const user = db.get(email);
        if (user) {
            console.log('Found user:', user);
            console.log('Stored hash:', user.password);
            console.log('Input hash:', AuthUtils.hashPassword(password));
        }
        if (user && user.password === AuthUtils.hashPassword(password)) {
            return user;
        }
    }
    return null;
}

function isEmailRegistered(email) {
    return USER_DATABASE.students.has(email) || USER_DATABASE.instructors.has(email);
}

function registerUser(userData) {
    const db = userData.role === 'student' ? USER_DATABASE.students : USER_DATABASE.instructors;
    const user = {
        ...userData,
        password: AuthUtils.hashPassword(userData.password),
        createdAt: new Date().toISOString()
    };
    db.set(userData.email, user);
    console.log('Registered user:', user);
    console.log('Database after registration:', Array.from(USER_DATABASE.students.keys()));
}

function initializeFormHandlers() {
    const loginForm = document.getElementById('login_form');
    const registerForm = document.getElementById('register_form');
    
    // Real-time validation for login
    document.getElementById('login_email').addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !AuthUtils.validateEmail(email)) {
            AuthUtils.showError('login_email', 'Please enter a valid email address');
        } else {
            AuthUtils.clearError('login_email');
        }
    });
    
    // Real-time validation for register
    document.getElementById('register_email').addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !AuthUtils.validateEmail(email)) {
            AuthUtils.showError('register_email', 'Please enter a valid email address');
        } else if (email && isEmailRegistered(email)) {
            AuthUtils.showError('register_email', 'Email is already registered');
        } else {
            AuthUtils.clearError('register_email');
        }
    });
    
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('login_btn');
        const email = document.getElementById('login_email').value.trim();
        const password = document.getElementById('login_password').value;
        
        console.log('Login attempt:', { email, password });
        
        // Validation
        let isValid = true;
        if (!email || !AuthUtils.validateEmail(email)) {
            AuthUtils.showError('login_email', 'Valid email is required');
            isValid = false;
        }
        if (!password) {
            AuthUtils.showError('login_password', 'Password is required');
            isValid = false;
        }
        if (!isValid) return;
        
        AuthUtils.setButtonLoading(loginBtn, true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const user = authenticateUser(email, password);
        console.log('Authentication result:', user);
        
        if (user) {
            AuthUtils.showToast(`Welcome back, ${user.firstName}!`, 'success');
            
            sessionStorage.setItem('currentUser', JSON.stringify({
                ...user,
                loginTime: Date.now()
            }));
            
            setTimeout(() => {
                window.location.href = user.role === 'student' ? 'student-dashboard/student.html' : 'instructor.html';
            }, 1000);
        } else {
            AuthUtils.showToast('Invalid email or password.', 'error');
            AuthUtils.setButtonLoading(loginBtn, false);
        }
    });
    
    // Register form
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const registerBtn = document.getElementById('register_btn');
        const formData = {
            firstName: document.getElementById('first_name').value.trim(),
            lastName: document.getElementById('last_name').value.trim(),
            email: document.getElementById('register_email').value.trim(),
            role: document.getElementById('user_role').value,
            password: document.getElementById('register_password').value,
            confirmPassword: document.getElementById('confirm_password').value
        };
        
        console.log('Registration attempt:', formData);
        
        // Validation
        let isValid = true;
        if (!formData.role) {
            AuthUtils.showError('user_role', 'Select your role');
            isValid = false;
        }
        if (!AuthUtils.validateName(formData.firstName)) {
            AuthUtils.showError('first_name', 'Please enter a valid first name');
            isValid = false;
        }
        if (!AuthUtils.validateName(formData.lastName)) {
            AuthUtils.showError('last_name', 'Please enter a valid last name');
            isValid = false;
        }
        if (!formData.email || !AuthUtils.validateEmail(formData.email)) {
            AuthUtils.showError('register_email', 'Valid email is required');
            isValid = false;
        } else if (isEmailRegistered(formData.email)) {
            AuthUtils.showError('register_email', 'Email is already registered');
            isValid = false;
        }
        if (!AuthUtils.validatePassword(formData.password)) {
            AuthUtils.showError('register_password', 'Password must be at least 8 characters');
            isValid = false;
        }
        if (formData.password !== formData.confirmPassword) {
            AuthUtils.showError('confirm_password', 'Passwords do not match');
            isValid = false;
        }
        if (!isValid) return;
        
        AuthUtils.setButtonLoading(registerBtn, true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        registerUser(formData);
        
        AuthUtils.showToast(`Account created successfully! Welcome, ${formData.firstName}.`, 'success');
        
        setTimeout(() => {
            sessionStorage.setItem('currentUser', JSON.stringify({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                role: formData.role,
                loginTime: Date.now()
            }));
            
            window.location.href = formData.role === 'student' ? 'student-dashboard/student.html' : 'instructor.html';
        }, 1000);
    });
}

// Passkey Authentication Functions
function initializePasskeyAuth() {
    const passkeyLoginBtn = document.getElementById('passkey-login-btn');
    
    // Check if passkeys are supported
    if (!window.PublicKeyCredential) {
        passkeyLoginBtn.style.display = 'none';
        console.log('Passkeys not supported in this browser');
        return;
    }

    // Passkey Login
    passkeyLoginBtn.addEventListener('click', async () => {
        try {
            AuthUtils.showToast('Attempting passkey login...', 'info');
            
            // Simulate passkey authentication (replace with real WebAuthn)
            const user = await simulatePasskeyLogin();
            
            if (user) {
                AuthUtils.showToast('Logged in with Passkey!', 'success');
                sessionStorage.setItem('currentUser', JSON.stringify({
                    ...user,
                    loginTime: Date.now()
                }));
                
                setTimeout(() => {
                    window.location.href = user.role === 'student' ? 'student-dashboard/student.html' : 'instructor.html';
                }, 1000);
            }
        } catch (error) {
            AuthUtils.showToast('Passkey login failed. Try password login.', 'error');
        }
    });

    // Simulate passkey login (replace with real WebAuthn implementation) REMOVE PLS
    async function simulatePasskeyLogin() {
        // For now, this simulates finding the test user
        // In a real implementation, this would use WebAuthn API
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const testUser = USER_DATABASE.students.get('undergraduate.student@student.edu');
                if (testUser) {
                    resolve(testUser);
                } else {
                    reject(new Error('No passkey found'));
                }
            }, 1000);
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Initialize Service Worker
    initializeServiceWorker();
    
    // TEST USER. DELETE BEFORE FINISHING APP. pls
    if (!USER_DATABASE.students.has('undergraduate.student@student.edu')) {
        USER_DATABASE.students.set('undergraduate.student@student.edu', {
            firstName: 'Undergraduate',
            lastName: 'Student',
            email: 'undergraduate.student@student.edu',
            role: 'student',
            password: AuthUtils.hashPassword('password123'),
            createdAt: new Date().toISOString()
        });
        console.log('Test student added during initialization');
    }
    
    console.log('Final database state:', Array.from(USER_DATABASE.students.keys()));
    
    initializeFormToggle();
    initializePWAInstall();
    initializePasskeyAuth();
    AuthUtils.initializePasswordToggles();
    initializeFormHandlers();
    
    // Auto-fill test credentials for easier testing. REMOVE BEFORE FINISHING
    document.getElementById('login_email').value = 'undergraduate.student@student.edu';
    document.getElementById('login_password').value = 'password123';
});