// Shared authentication utilities
class AuthUtils {
    static getApiBase() {
        return window.API_BASE || 'http://localhost:3000';
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePassword(password) {
        return password.length >= 8;
    }

    static validateName(name) {
        return name.trim().length >= 2;
    }

    static showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId + '_error');
        const fieldElement = document.getElementById(fieldId)?.closest('.form_group');
        
        if (errorElement && fieldElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            fieldElement.classList.add('error');
        }
    }

    static clearError(fieldId) {
        const errorElement = document.getElementById(fieldId + '_error');
        const fieldElement = document.getElementById(fieldId)?.closest('.form_group');
        
        if (errorElement && fieldElement) {
            errorElement.style.display = 'none';
            fieldElement.classList.remove('error');
        }
    }

    static showToast(message, type = 'info', duration = 4000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    static setButtonLoading(button, isLoading) {
        const btnText = button.querySelector('.btn_text');
        const btnLoading = button.querySelector('.btn_loading');
        
        if (isLoading) {
            button.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
        } else {
            button.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    static initializePasswordToggles() {
        document.querySelectorAll('.password_toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const input = toggle.previousElementSibling;
                const icon = toggle.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
    }

    static hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    static async apiRequest(path, options = {}) {
        const response = await fetch(`${this.getApiBase()}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.error || `Request failed (${response.status})`);
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload;
    }

    static async apiLogin(email, password) {
        return this.apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async apiRegister(userData) {
        return this.apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Find user in both student and instructor databases
    static async findUserByEmail(email) {
        // Check instructors first
        if (window.USER_DATABASE?.instructors?.has(email)) {
            const user = window.USER_DATABASE.instructors.get(email);
            return { ...user, role: 'instructor' };
        }
        
        // Then check students
        if (window.USER_DATABASE?.students?.has(email)) {
            const user = window.USER_DATABASE.students.get(email);
            return { ...user, role: 'student' };
        }
        
        return null;
    }

    // Verify password (demo with hash)
    static async verifyPassword(inputPassword, storedHash) {
        const inputHash = this.hashPassword(inputPassword);
        return inputHash === storedHash;
    }

    // Handle successful login and redirect
    static handleSuccessfulLogin(user) {
        try {
            // Auth page supports instructor login only.
            if (user.role !== 'instructor') {
                this.showToast('Student dashboard login is disabled. Use the QR check-in page.', 'error');
                return false;
            }

            sessionStorage.setItem('currentInstructor', JSON.stringify(user));
            this.showToast(`Welcome, Professor ${user.lastName}!`, 'success');
            setTimeout(() => {
                window.location.href = 'instructor-dashboard/instructor.html';
            }, 1000);

            return true;

        } catch (error) {
            console.error('Login redirect error:', error);
            this.showToast('Login failed', 'error');
            return false;
        }
    }
}  // <-- This closes the AuthUtils class
