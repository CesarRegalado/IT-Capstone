class PasswordResetConfirm {
    constructor() {
        this.resetToken = '';
        this.userEmail = '';
        this.isValidLink = false;
        
        this.checkResetLink();
        this.initializeEventListeners();
    }

    checkResetLink() {
        const urlParams = new URLSearchParams(window.location.search);
        this.resetToken = urlParams.get('token');
        this.userEmail = urlParams.get('email');

        // DEMO: Skip validation for testing
        if (this.resetToken && this.userEmail) {
            this.isValidLink = true;
            return;
        }

        if (!this.resetToken || !this.userEmail) {
            this.showLinkExpired();
        }
    }

    initializeEventListeners() {
        document.getElementById('password_reset_form').addEventListener('submit', (e) => this.handlePasswordReset(e));
        AuthUtils.initializePasswordToggles();
        
        // Password strength
        const passwordInput = document.getElementById('new_password');
        const strengthBar = document.querySelector('.strength_bar');
        if (passwordInput && strengthBar) {
            passwordInput.addEventListener('input', () => {
                AuthUtils.updatePasswordStrength(passwordInput, strengthBar);
            });
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        
        if (!this.isValidLink) {
            AuthUtils.showToast('This reset link is no longer valid', 'error');
            return;
        }

        const button = document.getElementById('create_password_btn');
        const password = document.getElementById('new_password').value;
        const confirmPassword = document.getElementById('confirm_new_password').value;
        
        if (password.length < 8) {
            AuthUtils.showError('new_password', 'Password must be at least 8 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            AuthUtils.showError('confirm_new_password', 'Passwords do not match');
            return;
        }
        
        AuthUtils.setButtonLoading(button, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`Password updated for ${this.userEmail}`);
        this.showSuccess();
        AuthUtils.setButtonLoading(button, false);
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    showLinkExpired() {
        document.getElementById('password_reset_form').hidden = true;
        document.getElementById('link_expired').hidden = false;
    }

    showSuccess() {
        document.getElementById('password_reset_form').hidden = true;
        document.getElementById('password_reset_success').hidden = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PasswordResetConfirm();
});