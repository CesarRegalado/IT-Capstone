// Shared authentication utilities
class AuthUtils {
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
            // Store user session based on role
            if (user.role === 'instructor') {
                sessionStorage.setItem('currentInstructor', JSON.stringify(user));
                this.showToast(`Welcome, Professor ${user.lastName}!`, 'success');
                setTimeout(() => {
                    window.location.href = 'instructor-dashboard/instructor.html';
                }, 1000);
            } else if (user.role === 'student') {
                sessionStorage.setItem('currentStudent', JSON.stringify(user));
                this.showToast(`Welcome, ${user.firstName}!`, 'success');
                setTimeout(() => {
                    window.location.href = 'student-dashboard/student.html';
                }, 1000);
            } else {
                this.showToast('Unknown user role', 'error');
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('Login redirect error:', error);
            this.showToast('Login failed', 'error');
            return false;
        }
    }
}  // <-- This closes the AuthUtils class