import Link from 'next/link';

export default function Home() {
  return (
    <div className="container">
      <h1>SVP Fullstack Demo</h1>
      <div className="card">
        <p>This demo uses SVP OTP login + your own access JWT + refresh cookie.</p>
        <p><Link href="/auth/login">Go to Login</Link></p>
      </div>
    </div>
  );
}
