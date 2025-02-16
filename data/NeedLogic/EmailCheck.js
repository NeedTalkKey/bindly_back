// 이메일 인증번호 확인 API 예시
async function verifyEmailAuth(email, inputCode) {
    try {
        const response = await fetch('/api/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, inputCode })
        });
        const data = await response.json();
        if (data.verified) {
            alert('이메일 인증이 완료되었습니다.');
        } else {
            alert(data.message || '인증번호가 올바르지 않습니다.');
        }
    } catch (error) {
        console.error('Error verifying email auth:', error);
    }
}