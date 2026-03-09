import { useState } from 'react';
import { api } from '../../lib/api';
import { useRouter } from 'next/router';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function submit(e){
    e.preventDefault();
    setMsg('Sending OTP...');
    try{
      await api('/api/auth/login', { method:'POST', body:{ login, password, otpMethod } });

      // Store credentials temporarily in sessionStorage for OTP step (avoid putting password in URL)
      sessionStorage.setItem("tmp_login", login);
      sessionStorage.setItem("tmp_password", password);
      sessionStorage.setItem("tmp_otpMethod", otpMethod);

      setMsg('OTP sent. Check your email/SMS.');
      router.push(`/auth/otp`);
    }catch(err){
      setMsg(JSON.stringify(err.data || err.message));
    }
  }

  return (
    <div className="container">
      <h2>Login (SVP)</h2>
      <form className="card" onSubmit={submit}>
        <label>Email/Username</label>
        <input value={login} onChange={e=>setLogin(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <label>OTP Method</label>
        <select value={otpMethod} onChange={e=>setOtpMethod(e.target.value)}>
          <option value="email">email</option>
          <option value="sms">sms</option>
        </select>
        <div style={{height:12}} />
        <button type="submit">Send OTP</button>
        <p className="small">{msg}</p>
      </form>
    </div>
  );
}
