(function () {
    const API_BASE = window.API_BASE || 'http://localhost:3000';

    const form = document.getElementById('checkin_form');
    const codeInput = document.getElementById('checkin_code');
    const studentIdInput = document.getElementById('student_id');
    const firstNameInput = document.getElementById('first_name');
    const lastNameInput = document.getElementById('last_name');
    const submitBtn = document.getElementById('submit_btn');
    const statusMessage = document.getElementById('status_message');
    const codeChip = document.getElementById('session_code_chip');

    function setStatus(message, kind) {
        statusMessage.textContent = message || '';
        statusMessage.className = `status${kind ? ` ${kind}` : ''}`;
    }

    function parseCodeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return (params.get('code') || '').trim().toUpperCase();
    }

    function normalizeInputs() {
        codeInput.value = codeInput.value.trim().toUpperCase();
        studentIdInput.value = studentIdInput.value.trim().toUpperCase();
        firstNameInput.value = firstNameInput.value.trim();
        lastNameInput.value = lastNameInput.value.trim();
        codeChip.textContent = codeInput.value || '----';
    }

    async function submitCheckIn(event) {
        event.preventDefault();
        normalizeInputs();
        setStatus('', '');

        if (!codeInput.value || !studentIdInput.value || !firstNameInput.value || !lastNameInput.value) {
            setStatus('Please complete all fields before submitting.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking In...';

        try {
            const res = await fetch(`${API_BASE}/attendance/check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: codeInput.value,
                    studentId: studentIdInput.value,
                    firstName: firstNameInput.value,
                    lastName: lastNameInput.value,
                    status: 'PRESENT'
                })
            });

            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setStatus(payload.error || 'Check-in failed. Please try again.', 'error');
                return;
            }

            const courseTitle = payload?.session?.course?.title || 'your class';
            setStatus(`Checked in successfully for ${courseTitle}.`, 'success');
            form.reset();
            codeInput.value = parseCodeFromUrl() || codeInput.value;
            normalizeInputs();
        } catch (error) {
            console.error('Check-in request failed:', error);
            setStatus('Network error. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Check In';
        }
    }

    const initialCode = parseCodeFromUrl();
    if (initialCode) {
        codeInput.value = initialCode;
    }
    normalizeInputs();

    form.addEventListener('submit', submitCheckIn);
    codeInput.addEventListener('input', normalizeInputs);
})();
