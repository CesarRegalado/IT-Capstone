class PasswordResetConfirm {
    constructor() {
        this.resetToken = '';
        this.isValidLink = false;

        this.initializeEventListeners();
        this.checkResetLink();
    }

    initializeEventListeners() {
        document.getElementById('password_reset_form').addEventListener('submit', (e) => this.handlePasswordReset(e));
        AuthUtils.initializePasswordToggles();

        const passwordInput = document.getElementById('new_password');
        const strengthBar = document.querySelector('.strength_bar');
        if (passwordInput && strengthBar) {
            passwordInput.addEventListener('input', () => {
                AuthUtils.updatePasswordStrength(passwordInput, strengthBar);
            });
        }
    }

    async checkResetLink() {
        const urlParams = new URLSearchParams(window.location.search);
        this.resetToken = (urlParams.get('token') || '').trim();

        if (!this.resetToken) {
            this.showLinkExpired();
            return;
        }

        try {
            await AuthUtils.apiValidateResetToken(this.resetToken);
            this.isValidLink = true;
        } catch (error) {
            console.error('Reset token validation error:', error);
            this.showLinkExpired();
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
        try {
            await AuthUtils.apiResetPassword(this.resetToken, password);
            this.showSuccess();
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('Password reset error:', error);
            AuthUtils.showToast(error.message || 'Unable to update password', 'error');
        } finally {
            AuthUtils.setButtonLoading(button, false);
        }
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