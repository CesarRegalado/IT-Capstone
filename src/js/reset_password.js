class PasswordResetRequest {
    constructor() {
        this.userEmail = '';
        this.debugResetUrl = '';
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

    async requestResetLink(email) {
        const payload = await AuthUtils.apiForgotPassword(email);
        if (payload?.debugResetUrl) {
            this.debugResetUrl = payload.debugResetUrl;
            console.log('Password reset link (local test):', payload.debugResetUrl);
        }
        return payload;
    }

    async handleEmailSubmit(e) {
        e.preventDefault();
        const button = document.getElementById('send_reset_btn');

        if (!this.validateEmail()) return;

        this.userEmail = document.getElementById('reset_email').value.trim();
        AuthUtils.setButtonLoading(button, true);

        try {
            await this.requestResetLink(this.userEmail);
            this.showSuccess();
            AuthUtils.showToast('If the account exists, a reset link has been sent.', 'success');
        } catch (error) {
            console.error('Forgot password error:', error);
            AuthUtils.showToast(error.message || 'Unable to send reset link', 'error');
        } finally {
            AuthUtils.setButtonLoading(button, false);
        }
    }

    async handleResendEmail(e) {
        e.preventDefault();
        const button = document.getElementById('resend_email_btn');

        if (!this.userEmail) return;

        button.disabled = true;
        try {
            await this.requestResetLink(this.userEmail);
            AuthUtils.showToast('If the account exists, a new reset link has been sent.', 'success');
        } catch (error) {
            console.error('Resend reset error:', error);
            AuthUtils.showToast(error.message || 'Unable to resend reset link', 'error');
        } finally {
            button.disabled = false;
        }
    }

    showSuccess() {
        document.getElementById('email_request_form').hidden = true;
        document.getElementById('email_sent_success').hidden = false;
        document.getElementById('sent_email_display').textContent = this.userEmail;

        if (this.debugResetUrl) {
            const message = document.createElement('p');
            message.style.marginTop = '12px';
            message.textContent = `Local test link printed to console.`;
            document.getElementById('email_sent_success').appendChild(message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PasswordResetRequest();
});