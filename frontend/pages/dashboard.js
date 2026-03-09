import { useEffect, useState } from 'react';
import CreateBookingModal from '../components/CreateBookingModal';
import { api } from '../lib/api';
import { useRouter } from 'next/router';

export default function Dashboard(){
  const [openBooking, setOpenBooking] = useState(false);
  const [out, setOut] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Quick check: if no access token yet, go login
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!t) router.push('/auth/login');
  }, [router]);

  async function call(path, opts){
    setOut('Loading...');
    try{
      const res = await api(path, opts);
      setOut(JSON.stringify(res, null, 2));
    }catch(err){
      setOut(JSON.stringify(err.data || err.message, null, 2));
    }
  }

  async function logout(){
    try{
      await api('/api/auth/logout', { method:'POST' });
    }catch{}
    localStorage.removeItem('accessToken');
    router.push('/auth/login');
  }

  return (
    <>
      <div className="container">
        <h2>Dashboard</h2>
        <p className="small"><a href="/exam/booking">Exam Search + Booking</a></p>
        <div className="card">
          <p className="small">
            Access token is auto-loaded from localStorage. If it expires, the client auto-calls /api/auth/refresh
            (refresh token is HttpOnly cookie) and retries once.
          </p>

          <div className="row" style={{marginTop:12}}>
            <button onClick={()=>setOpenBooking(true)}>Create New Booking</button>
          </div>

          <div className="row">
            <button onClick={()=>call('/api/me')}>/api/me</button>
            <button onClick={()=>call('/api/svp/permissions')}>SVP permissions</button>
            <button onClick={()=>call('/api/svp/occupations')}>SVP occupations</button>
          </div>

          <div className="row" style={{marginTop:12}}>
            <button onClick={()=>call('/api/svp/exam-constraints')}>SVP exam_constraints</button>
            <button onClick={()=>call('/api/svp/certificate-price')}>SVP certificate_price</button>
            <button onClick={()=>call('/api/svp/feature-flags')}>SVP feature_flags</button>
          </div>

          <div className="row" style={{marginTop:12}}>
            <button onClick={()=>call('/api/auth/refresh', { method:'POST' })}>Force refresh</button>
            <button onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="card">
          <h3>Output</h3>
          <pre>{out}</pre>
        </div>
      </div>
      <CreateBookingModal open={openBooking} onClose={()=>setOpenBooking(false)} />
    </>
  );
}
