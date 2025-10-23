// Shared authentication utilities
class AuthUtils {
    static SECURITY_CONFIG = {
        minPasswordLength: 8,
        maxAttempts: 5,
        lockoutTime: 15 * 60 * 1000,
        sessionTimeout: 30 * 60 * 1000
    };

    // Validation functions
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email) && email.length <= 254;
    }

    static validatePassword(password) {
        return password.length >= this.SECURITY_CONFIG.minPasswordLength &&
               /[A-Z]/.test(password) &&
               /[a-z]/.test(password) &&
               /[0-9]/.test(password);
    }

    static validateName(name) {
        return name.trim().length >= 2 && name.length <= 50 && /^[a-zA-Z\s\-']+$/.test(name);
    }

    // Error handling
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

    // UI utilities
    static showToast(message, type = 'info', duration = 5000) {
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
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline';
        } else {
            button.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }

    // Password strength
    static updatePasswordStrength(passwordInput, strengthBar) {
        const password = passwordInput.value;
        let strength = 0;
        
        if (password.length >= this.SECURITY_CONFIG.minPasswordLength) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        strengthBar.className = 'strength_bar';
        if (strength > 0) {
            strengthBar.classList.add(
                strength <= 2 ? 'weak' : 
                strength <= 4 ? 'medium' : 'strong'
            );
        }
    }

    // Password toggle
    static initializePasswordToggles() {
        const passwordToggles = document.querySelectorAll('.password_toggle');
        
        passwordToggles.forEach(toggle => {
            const togglePassword = () => {
                const input = toggle.previousElementSibling;
                const icon = toggle.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                    toggle.setAttribute('aria-label', 'Hide password');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                    toggle.setAttribute('aria-label', 'Show password');
                }
            };
            
            toggle.addEventListener('click', togglePassword);
            toggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePassword();
                }
            });
        });
    }

    // Simple password hashing (demo only)
    static hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
}