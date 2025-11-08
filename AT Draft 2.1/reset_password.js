class PasswordResetRequest {
    constructor() {
        this.userEmail = '';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('email_request_form').addEventListener('submit', (e) => this.handleEmailSubmit(e));
        document.getElementById('resend_email_btn').addEventListener('click', (e) => this.handleResendEmail(e));
    }

    validateEmail() {
        const email = document.getElementById('reset_email').value.trim();
        
        if (!email) {
            AuthUtils.showError('reset_email', 'Email required');
            return false;
        }
        
        if (!AuthUtils.validateEmail(email)) {
            AuthUtils.showError('reset_email', 'Valid email required');
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
        
        this.showSuccess();
        AuthUtils.setButtonLoading(button, false);
    }

    async handleResendEmail(e) {
        e.preventDefault();
        const button = document.getElementById('resend_email_btn');
        
        if (!this.userEmail) return;
        
        AuthUtils.setButtonLoading(button, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        AuthUtils.showToast('New reset link sent', 'success');
        AuthUtils.setButtonLoading(button, false);
    }

    showSuccess() {
        document.getElementById('email_request_form').hidden = true;
        document.getElementById('email_sent_success').hidden = false;
        document.getElementById('sent_email_display').textContent = this.userEmail;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PasswordResetRequest();
});