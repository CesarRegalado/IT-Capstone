import { User, Instructor, Student, Course, Session, qrcode } from './classes/index.js';
import AuthUtils from './shared-auth.js';
import "./student_test_data.js";
import { testDB } from './classes/testDB.js';


//switches between login and register forms, also clears errors when switching
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

// PWA Install Prompt Handling
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

//FIXME: This should be implemented to check DATABASE and then replace current
//       authentication method in loginFormHandler()
function authenticateUser(email, password) {
    // This is a placeholder function. Replace with actual authentication logic that checks DATABASE.
}

// FIXME: This is currently checking the testDB instead of DATABASE
function isEmailRegistered(email) {
    return testDB.usersArr.some(user => user.UNTemail === email);
}

// Handles registration form submission
function initializeRegisterFormHandler() {
    const registerForm = document.getElementById('register_form');

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
        

        const newUser = new User(
            formData.userId,
            formData.firstName,
            formData.lastName,
            formData.email,
            formData.role,
            AuthUtils.hashPassword(formData.password)
        );
        
        newUser.registerUser();

        AuthUtils.showToast(`Account created successfully! Welcome, ${formData.firstName}.`, 'success');
        
        setTimeout(() => {
            sessionStorage.setItem('currentUser', JSON.stringify({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                role: formData.role,
                loginTime: Date.now()
            }));
            
            window.location.href = formData.role === 'student' ? 'student-dashboard/student.html' : 'instructor-dashboard/instructor.html';
        }, 1000);
    });
            
}

// Handles login form submission and live validation
function initializeLoginFormHandler() {
    const loginForm = document.getElementById('login_form');
    
    // Real-time validation for login
    document.getElementById('login_email').addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !AuthUtils.validateEmail(email)) {
            AuthUtils.showError('login_email', 'Please enter a valid email address');
        } else {
            AuthUtils.clearError('login_email');
        }
    });
        
    // Login form - UPDATED VERSION
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('login_btn');
        const email = document.getElementById('login_email').value.trim();
        const password = document.getElementById('login_password').value;
        
        console.log('Login attempt:', { email, password });
        
        AuthUtils.setButtonLoading(loginBtn, true);
        
        try {
            // Validate inputs
            if (!AuthUtils.validateEmail(email)) {
                AuthUtils.showToast('Please enter a valid email address', 'error');
                return;
            }

            if (!AuthUtils.validatePassword(password)) {
                AuthUtils.showToast('Password must be at least 8 characters', 'error');
                return;
            }

            // FIXME: When DATABASE is implemented, replace this with authenticateUser()
            //        that checks DATABASE. 
            if (isEmailRegistered(email)) {
                const userData = await AuthUtils.findUserByEmail(email);
                console.log('User data retrieved for login:', userData);
                const isPasswordValid = await AuthUtils.verifyPassword(password, userData.password);
                if (!isPasswordValid) {
                    AuthUtils.showToast('Invalid password', 'error');
                    return;
                }
                const currentUser = new User(
                    userData.userId,
                    userData.firstName,
                    userData.lastName,
                    userData.UNTemail,
                    userData.role,
                    userData.password
                );
                //This is used for the .showToast() and redirect to dashboard in User.userLogin()
                AuthUtils.handleSuccessfulLogin(currentUser);
            } else {
                AuthUtils.showToast('Email not found. Please register first.', 'error');
                return;
            }            
        } catch (error) {
            console.error('Login error:', error);
            AuthUtils.showToast('Login failed', 'error');
        } finally {
            AuthUtils.setButtonLoading(loginBtn, false);
        }
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

    // Passkey Login. REMOVE 
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
            }, );
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Initialize Service Worker
    initializeServiceWorker();
    
    /*/ TEST USER. DELETE BEFORE FINISHING APP. pls
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
    
    // TEST INSTRUCTOR. DELETE BEFORE FINISHING APP.
    if (!USER_DATABASE.instructors.has('instructor@university.edu')) {
        USER_DATABASE.instructors.set('instructor@university.edu', {
            firstName: 'John',
            lastName: 'Doe',
            email: 'instructor@university.edu',
            role: 'instructor',
            password: AuthUtils.hashPassword('password123'),
            createdAt: new Date().toISOString()
        });
        console.log('Test instructor added during initialization');
    }
    
    console.log('Final database state:', Array.from(USER_DATABASE.students.keys()));*/
    
    initializeFormToggle();
    initializePWAInstall();
    initializePasskeyAuth();
    AuthUtils.initializePasswordToggles();
    initializeRegisterFormHandler();
    initializeLoginFormHandler();
    
    // Auto-fill test credentials for easier testing. REMOVE BEFORE FINISHING
    //document.getElementById('login_email').value = 'undergraduate.student@student.edu';
    //document.getElementById('login_password').value = 'password123';
});