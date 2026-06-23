import React, { useState } from 'react';
import { 
  HeartPulse, 
  User, 
  ShieldCheck, 
  Lock, 
  Mail, 
  LogIn,
  Tv
} from 'lucide-react';
import { PatientPortal } from './PatientPortal';

interface AuthPanelProps {
  onLoginSuccess: (token: string, user: { _id: string; name: string; email: string; role: string; phone?: string; specialization?: string }) => void;
  onLaunchMonitor?: () => void;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({ onLoginSuccess, onLaunchMonitor }) => {
  // Mode selection: staff gateway vs patient Hub
  const [panelMode, setPanelMode] = useState<'staff' | 'patient'>('staff');

  // Roles matching tabs: 'receptionist' | 'doctor'
  const [activeRole, setActiveRole] = useState<'receptionist' | 'doctor'>('receptionist');

  // Login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // State info feedback
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick credentials dictionary for ease of review
  const testCredentials = {
    receptionist: { email: 'receptionist@queuecure.com', password: 'recep123' },
    doctor: { email: 'doctor.jenkins@queuecure.com', password: 'doctor123' }
  };

  const autofill = (role: 'receptionist' | 'doctor') => {
    const creds = testCredentials[role];
    setEmail(creds.email);
    setPassword(creds.password);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please key in your email and password credentials.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login credentials unauthorized");
      }
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden text-slate-800">
      
      {/* Visual background accents */}
      <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-sky-500/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-teal-500/5 rounded-full blur-[60px] pointer-events-none" />

      {/* Brand Icon Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3.5 bg-sky-50 text-sky-600 rounded-2xl shadow-sm border border-sky-100 mb-2">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-sans font-extrabold tracking-tight text-slate-900">Queue Cure Gateway</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto font-semibold tracking-wide uppercase">
          Role-Based Portal Access
        </p>
      </div>

      {/* Gateways Tab Selector */}
      <div className="flex border-b border-slate-200/50 pb-2">
        <button
          type="button"
          onClick={() => setPanelMode('staff')}
          className={`flex-1 pb-3 text-xs uppercase tracking-wider font-extrabold text-center transition-all border-b-2 cursor-pointer ${
            panelMode === 'staff'
              ? 'border-sky-600 text-sky-700 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          🏥 Clinic Staff Portal
        </button>
        <button
          type="button"
          onClick={() => setPanelMode('patient')}
          className={`relative flex-1 pb-3 text-xs uppercase tracking-wider font-extrabold text-center transition-all border-b-2 cursor-pointer ${
            panelMode === 'patient'
              ? 'border-sky-600 text-sky-700 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <span>👤 Patient Portal Hub</span>
          <span className="absolute top-[-3px] right-2 px-1.5 py-0.5 text-[8px] tracking-wider rounded bg-amber-500 text-white font-black animate-pulse">NEW</span>
        </button>
      </div>

      {panelMode === 'patient' ? (
        <PatientPortal />
      ) : (
        <>
          {/* Tabs list for Login Roles */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/40">
            {(['receptionist', 'doctor'] as const).map((role) => {
              const isActive = activeRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setActiveRole(role);
                    setError(null);
                    setEmail('');
                    setPassword('');
                  }}
                  className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200/30' 
                      : 'text-slate-500 hover:text-slate-850 hover:bg-white/30'
                  }`}
                >
                  {role === 'receptionist' ? 'Receptionist' : 'Doctor'}
                </button>
              );
            })}
          </div>

          {/* Error Feeds */}
          {error && (
            <div id="auth_error_box" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-rose-500 rotate-180" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Auth Forms */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`${activeRole}@queuecure.com`}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="text-left space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Security Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login_password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Assistant autofill helper */}
            <div className="bg-sky-50/40 border border-sky-100/80 p-3 rounded-xl space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-sky-850 tracking-wider">Quick Clinic Access</span>
                <span className="text-[9px] text-slate-405">Autofill credentials for evaluation</span>
              </div>
              <button
                type="button"
                onClick={() => autofill(activeRole)}
                className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-sky-600 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-500" /> Autofill Test {activeRole === 'receptionist' ? 'Receptionist' : 'Doctor'}
              </button>
            </div>

            <button
              id="btn_auth_submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md shadow-sky-500/5 flex items-center justify-center gap-2 hover:translate-y-[-1px] active:translate-y-[0px]"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Secure Log In</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </>
      )}

      {/* Launch TV Monitor Option */}
      {onLaunchMonitor && (
        <div className="mt-5 pt-4 border-t border-slate-200/50">
          <div className="flex items-center gap-2 mb-2 justify-center text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Waiting Room TV Monitor</span>
          </div>
          <button
            type="button"
            onClick={onLaunchMonitor}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-slate-900/5 group"
          >
            <Tv className="w-3.5 h-3.5 text-sky-450 group-hover:scale-110 transition-transform" />
            <span>Launch Live TV Queue Monitor</span>
          </button>
        </div>
      )}
    </div>
  );
};
