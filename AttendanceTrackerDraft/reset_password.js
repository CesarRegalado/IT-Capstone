class PasswordResetRequest {
    constructor() {
        this.userEmail = '';
        this.resetToken = '';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('email_request_form').addEventListener('submit', (e) => this.handleEmailSubmit(e));
        document.getElementById('resend_email_btn').addEventListener('click', (e) => this.handleResendEmail(e));
        
        document.getElementById('reset_email').addEventListener('blur', () => this.validateEmail());
    }

    validateEmail() {
        const email = document.getElementById('reset_email').value.trim();
        
        if (!email) {
            AuthUtils.showError('reset_email', 'Email is required');
            return false;
        }
        
        if (!AuthUtils.validateEmail(email)) {
            AuthUtils.showError('reset_email', 'Please enter a valid email address');
            return false;
        }
        
        AuthUtils.clearError('reset_email');
        return true;
    }

    async handleEmailSubmit(e) {
        e.preventDefault();
        const button = document.getElementById('send_reset_btn');
        
        if (!this.validateEmail()) return;
        
        this.userEmail = document.getElementById('reset_email').value.trim();
        AuthUtils.setButtonLoading(button, true);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.resetToken = this.generateResetToken();
        console.log('Reset token generated:', this.resetToken);
        
        this.showSuccess();
        AuthUtils.setButtonLoading(button, false);
    }

    async handleResendEmail(e) {
        e.preventDefault();
        const button = document.getElementById('resend_email_btn');
        
        if (!this.userEmail) return;
        
        AuthUtils.setButtonLoading(button, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.resetToken = this.generateResetToken();
        AuthUtils.showToast('New reset link sent to your email', 'success');
        AuthUtils.setButtonLoading(button, false);
    }

    generateResetToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    showSuccess() {
        document.getElementById('email_request_form').hidden = true;
        document.getElementById('email_sent_success').hidden = false;
        document.getElementById('sent_email_display').textContent = this.userEmail;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PasswordResetRequest();
    AuthUtils.initializePasswordToggles();
});