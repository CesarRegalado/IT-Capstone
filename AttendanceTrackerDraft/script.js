// User database simulation
const USER_DATABASE = {
    students: new Map(),
    instructors: new Map()
};

// Security state
let loginAttempts = new Map();
let lockedAccounts = new Map();

// Form Toggle
function initializeFormToggle() {
    const loginToggle = document.getElementById('login_toggle');
    const registerToggle = document.getElementById('register_toggle');
    const loginForm = document.getElementById('login_form');
    const registerForm = document.getElementById('register_form');
    
    const switchToLogin = () => {
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        loginForm.hidden = false;
        registerForm.hidden = true;
        loginToggle.setAttribute('aria-selected', 'true');
        registerToggle.setAttribute('aria-selected', 'false');
    };
    
    const switchToRegister = () => {
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        registerForm.hidden = false;
        loginForm.hidden = true;
        registerToggle.setAttribute('aria-selected', 'true');
        loginToggle.setAttribute('aria-selected', 'false');
    };
    
    loginToggle.addEventListener('click', switchToLogin);
    registerToggle.addEventListener('click', switchToRegister);
}

// Security functions
function isAccountLocked(email) {
    const lockTime = lockedAccounts.get(email);
    if (lockTime && Date.now() - lockTime < AuthUtils.SECURITY_CONFIG.lockoutTime) {
        return true;
    }
    
    if (lockTime && Date.now() - lockTime >= AuthUtils.SECURITY_CONFIG.lockoutTime) {
        lockedAccounts.delete(email);
        loginAttempts.delete(email);
    }
    
    return false;
}

function incrementLoginAttempts(email) {
    const attempts = loginAttempts.get(email) || 0;
    loginAttempts.set(email, attempts + 1);
    
    if (attempts + 1 >= AuthUtils.SECURITY_CONFIG.maxAttempts) {
        lockedAccounts.set(email, Date.now());
        AuthUtils.showToast('Account temporarily locked. Please try again in 15 minutes.', 'error', 7000);
    }
}

// Demo authentication
function authenticateUser(email, password) {
    for (const [dbName, db] of Object.entries(USER_DATABASE)) {
        const user = db.get(email);
        if (user && user.password === AuthUtils.hashPassword(password)) {
            user.lastLogin = new Date().toISOString();
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
    db.set(userData.email, userData);
}

// Form handlers
function initializeFormHandlers() {
    const loginForm = document.getElementById('login_form');
    const registerForm = document.getElementById('register_form');
    
    // Real-time validation
    document.getElementById('login_email').addEventListener('blur', () => {
        const email = document.getElementById('login_email').value.trim();
        if (email && !AuthUtils.validateEmail(email)) {
            AuthUtils.showError('login_email', 'Please enter a valid email address');
        } else {
            AuthUtils.clearError('login_email');
        }
    });
    
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('login_btn');
        const email = document.getElementById('login_email').value.trim();
        const password = document.getElementById('login_password').value;
        
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
        
        // Security check
        if (isAccountLocked(email)) {
            AuthUtils.showToast('Account is temporarily locked. Please try again later.', 'error');
            return;
        }
        
        AuthUtils.setButtonLoading(loginBtn, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const user = authenticateUser(email, password);
        if (user) {
            loginAttempts.delete(email);
            AuthUtils.showToast(`Welcome back, ${user.firstName}!`, 'success');
            
            sessionStorage.setItem('currentUser', JSON.stringify({
                ...user,
                loginTime: Date.now()
            }));
            
            setTimeout(() => {
                window.location.href = user.role === 'student' ? 'student_dashboard.html' : 'instructor_dashboard.html';
            }, 1000);
        } else {
            incrementLoginAttempts(email);
            AuthUtils.showToast('Invalid email or password', 'error');
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
        
        // Validation
        let isValid = true;
        if (!formData.role) {
            AuthUtils.showError('user_role', 'Please select your role');
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
            AuthUtils.showError('register_password', 'Password must be at least 8 characters with uppercase, lowercase, and numbers');
            isValid = false;
        }
        if (formData.password !== formData.confirmPassword) {
            AuthUtils.showError('confirm_password', 'Passwords do not match');
            isValid = false;
        }
        if (!isValid) return;
        
        AuthUtils.setButtonLoading(registerBtn, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        registerUser({
            ...formData,
            password: AuthUtils.hashPassword(formData.password),
            createdAt: new Date().toISOString()
        });
        
        AuthUtils.showToast(`Account created successfully! Welcome, ${formData.firstName}.`, 'success');
        
        setTimeout(() => {
            sessionStorage.setItem('currentUser', JSON.stringify({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                role: formData.role,
                loginTime: Date.now()
            }));
            
            window.location.href = formData.role === 'student' ? 'student_dashboard.html' : 'instructor_dashboard.html';
        }, 1000);
    });
}

// PWA Installation
function initializePWA() {
    let deferredPrompt;
    const installPrompt = document.getElementById('install_prompt');
    const installBtn = document.getElementById('install_btn');
    const closePrompt = document.getElementById('close_prompt');
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA install prompt available');
        
        // Show prompt after a short delay
        setTimeout(() => {
            if (installPrompt && !localStorage.getItem('installPromptDismissed')) {
                installPrompt.classList.add('show');
                console.log('Showing install prompt in hero section');
            }
        }, 3000);
    });
    
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                AuthUtils.showToast('App installation not available', 'warning');
                return;
            }
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                AuthUtils.showToast('App installed successfully!', 'success');
                localStorage.setItem('appInstalled', 'true');
                installPrompt.classList.remove('show');
            } else {
                AuthUtils.showToast('App installation cancelled', 'info');
            }
            
            deferredPrompt = null;
        });
    }
    
    if (closePrompt) {
        closePrompt.addEventListener('click', () => {
            if (installPrompt) {
                installPrompt.classList.remove('show');
                localStorage.setItem('installPromptDismissed', 'true');
            }
        });
    }
    
    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
        localStorage.setItem('appInstalled', 'true');
        if (installPrompt) installPrompt.classList.remove('show');
        console.log('PWA was installed');
    });
    
    // For testing: Force show the prompt (remove in production)
    setTimeout(() => {
        if (installPrompt && !localStorage.getItem('installPromptDismissed')) {
            installPrompt.classList.add('show');
            console.log('TEST: Showing install prompt in hero section');
        }
    }, 2000);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    initializeFormToggle();
    AuthUtils.initializePasswordToggles();
    initializeFormHandlers();
    initializePWA();
    
    // Password strength for register form
    const passwordInput = document.getElementById('register_password');
    const strengthBar = document.querySelector('.strength_bar');
    if (passwordInput && strengthBar) {
        passwordInput.addEventListener('input', () => {
            AuthUtils.updatePasswordStrength(passwordInput, strengthBar);
        });
    }
});