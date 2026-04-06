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

        document.querySelectorAll('.error_message').forEach(error => {
            error.style.display = 'none';
        });
        document.querySelectorAll('.form_group').forEach(group => {
            group.classList.remove('error');
        });
    };

    loginToggle.addEventListener('click', () => switchForms(true));
    registerToggle.addEventListener('click', () => switchForms(false));
    window.setAuthMode = (mode) => switchForms(mode !== 'register');
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

    if (window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'none';
        return;
    }

    installBtn.style.display = 'inline-flex';

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

    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        installBtn.style.display = 'none';
        deferredPrompt = null;
    });
}

function isEmailRegistered(email) {
    return USER_DATABASE.students.has(email) || USER_DATABASE.instructors.has(email);
}

async function handleEmailVerificationFromLink() {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verifyToken');
    if (!verifyToken) return;

    try {
        const result = await AuthUtils.apiVerifyEmail(verifyToken);
        AuthUtils.showToast(result.message || 'Email verified. You can now log in.', 'success');

        const emailInput = document.getElementById('login_email');
        if (emailInput && result.email) {
            emailInput.value = result.email;
        }

        if (typeof window.setAuthMode === 'function') {
            window.setAuthMode('login');
        }
    } catch (error) {
        console.error('Verification error:', error);
        AuthUtils.showToast(error.message || 'Verification link is invalid or expired', 'error');
    } finally {
        params.delete('verifyToken');
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, document.title, nextUrl);
    }
}

function initializeFormHandlers() {
    const loginForm = document.getElementById('login_form');
    const registerForm = document.getElementById('register_form');

    document.getElementById('login_email').addEventListener('blur', function() {
        const email = this.value.trim();
        if (email && !AuthUtils.validateEmail(email)) {
            AuthUtils.showError('login_email', 'Please enter a valid email address');
        } else {
            AuthUtils.clearError('login_email');
        }
    });

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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('login_btn');
        const email = document.getElementById('login_email').value.trim();
        const password = document.getElementById('login_password').value;

        AuthUtils.setButtonLoading(loginBtn, true);

        try {
            if (!AuthUtils.validateEmail(email)) {
                AuthUtils.showToast('Please enter a valid email address', 'error');
                return;
            }

            if (!AuthUtils.validatePassword(password)) {
                AuthUtils.showToast('Password must be at least 8 characters', 'error');
                return;
            }

            const user = await AuthUtils.apiLogin(email, password);
            AuthUtils.handleSuccessfulLogin(user);
        } catch (error) {
            console.error('Login error:', error);

            if (error?.payload?.code === 'EMAIL_NOT_VERIFIED') {
                AuthUtils.showToast('Verify your email before logging in. Sending a new verification link...', 'error');
                try {
                    const resendResult = await AuthUtils.apiResendVerification(email);
                    if (resendResult?.debugVerificationUrl) {
                        console.log('Verification link (local test):', resendResult.debugVerificationUrl);
                    }
                } catch (resendError) {
                    console.error('Resend verification failed:', resendError);
                }
            } else {
                AuthUtils.showToast(error.message || 'Login failed', 'error');
            }
        } finally {
            AuthUtils.setButtonLoading(loginBtn, false);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const registerBtn = document.getElementById('register_btn');
        const formData = {
            firstName: document.getElementById('first_name').value.trim(),
            lastName: document.getElementById('last_name').value.trim(),
            email: document.getElementById('register_email').value.trim(),
            role: 'instructor',
            password: document.getElementById('register_password').value,
            confirmPassword: document.getElementById('confirm_password').value
        };

        let isValid = true;
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

        try {
            const result = await AuthUtils.apiRegister({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: formData.role
            });

            if (result?.debugVerificationUrl) {
                console.log('Verification link (local test):', result.debugVerificationUrl);
            }

            AuthUtils.showToast(result.message || 'Account created. Check your email for the verification link.', 'success');
            if (typeof window.setAuthMode === 'function') {
                window.setAuthMode('login');
            }

            const loginEmail = document.getElementById('login_email');
            if (loginEmail) {
                loginEmail.value = formData.email;
            }

            registerForm.reset();
        } catch (error) {
            console.error('Registration error:', error);
            if (error.status === 409) {
                AuthUtils.showError('register_email', 'Email is already registered');
            }
            AuthUtils.showToast(error.message || 'Registration failed', 'error');
        } finally {
            AuthUtils.setButtonLoading(registerBtn, false);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');

    initializeServiceWorker();
    initializeFormToggle();
    initializePWAInstall();
    AuthUtils.initializePasswordToggles();
    initializeFormHandlers();
    handleEmailVerificationFromLink();
});