import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useRouter } from 'next/router';

export default function Otp() {
  const router = useRouter();
  const { login: qLogin, password: qPassword, otpMethod: qOtpMethod } = router.query;

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');

  const [otpAttempt, setOtp] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Prefer query (if exists), otherwise use sessionStorage (recommended)
    const sLogin = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_login') : '';
    const sPass = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_password') : '';
    const sOtp  = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_otpMethod') : 'email';

    setLogin(String(qLogin || sLogin || ''));
    setPassword(String(qPassword || sPass || ''));
    setOtpMethod(String(qOtpMethod || sOtp || 'email'));
  }, [qLogin, qPassword, qOtpMethod]);

  async function verify(e){
    e.preventDefault();
    setMsg('Verifying...');
    try{
      const res = await api('/api/auth/otp-verify', {
        method:'POST',
        body:{ login, password, otpAttempt, otpMethod }
      });

      // Auto-save your backend access token
      localStorage.setItem("accessToken", res.accessToken);

      // Clear temp credentials
      sessionStorage.removeItem('tmp_login');
      sessionStorage.removeItem('tmp_password');
      sessionStorage.removeItem('tmp_otpMethod');

      setMsg('Login successful. Redirecting to dashboard...');
      router.push('/dashboard');
    }catch(err){
      setMsg(JSON.stringify(err.data || err.message));
    }
  }

  return (
    <div className="container">
      <h2>OTP Verify</h2>
      <div className="card">
        <p className="small">Login: {String(login || '')}</p>
        <form onSubmit={verify}>
          <label>OTP Code</label>
          <input value={otpAttempt} onChange={e=>setOtp(e.target.value)} required />
          <button type="submit">Verify OTP</button>
        </form>
        <p className="small">{msg}</p>
      </div>
    </div>
  );
}
