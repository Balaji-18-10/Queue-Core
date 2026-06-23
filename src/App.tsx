import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Patient, QueueSettings, QueueAnalytics } from './types';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { PatientViewDashboard } from './components/PatientViewDashboard';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { AuthPanel } from './components/AuthPanel';
import { DoctorDashboard } from './components/DoctorDashboard';
import { WaitingRoomDisplay } from './components/WaitingRoomDisplay';
import { 
  Users, 
  UserCheck, 
  Clock, 
  HeartPulse, 
  ShieldCheck,
  Zap,
  Activity,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  Award,
  Calendar,
  AlertTriangle,
  Menu,
  X,
  Sliders
} from 'lucide-react';

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem('qc_token'));
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('qc_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Global synchronization states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [settings, setSettings] = useState<QueueSettings>({ consultationTime: 10, currentToken: 0 });
  const [analytics, setAnalytics] = useState<QueueAnalytics | null>(null);

  // Shared token select sync hook
  const [selectedToken, setSelectedToken] = useState<number | null>(null);

  // SaaS Navigation structures
  const [activeTab, setActiveTab ] = useState<string>('dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMonitor, setViewMonitor] = useState<boolean>(() => {
    return window.location.search.includes('monitor=true');
  });

  // REST API data polling (fallback in sandbox iframe environment)
  const fetchStateDirect = async () => {
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/settings'),
        fetch('/api/analytics')
      ]);
      if (pRes.ok && sRes.ok && aRes.ok) {
        const patientsData = await pRes.json();
        const settingsData = await sRes.json();
        const analyticsData = await aRes.json();
        setPatients(patientsData);
        setSettings(settingsData);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.warn("Failed REST state sync fallback:", err);
    }
  };

  // Setup client Socket.IO listeners
  useEffect(() => {
    fetchStateDirect();

    const socket: Socket = io(window.location.origin, {
      transports: ['polling', 'websocket'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5
    });

    socket.on('connect', () => {
      console.log('Real-time websocket connection initialized successfully');
      socket.emit('request_sync');
    });

    socket.on('sync', (data: { patients: Patient[]; settings: QueueSettings; analytics: QueueAnalytics }) => {
      setPatients(data.patients);
      setSettings(data.settings);
      setAnalytics(data.analytics);
    });

    const pollingInterval = setInterval(fetchStateDirect, 4000);

    return () => {
      socket.off('sync');
      socket.disconnect();
      clearInterval(pollingInterval);
    };
  }, []);

  // Authentication callbacks
  const handleLoginSuccess = (token: string, user: any) => {
    setToken(token);
    setUser(user);
    setActiveTab('dashboard'); // Reset tab upon successful authentication
    localStorage.setItem('qc_token', token);
    localStorage.setItem('qc_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    localStorage.removeItem('qc_token');
    localStorage.removeItem('qc_user');
  };

  // API Call proxies:
  const handleAddPatient = async (inputOrName: any, isEmergencyParam?: boolean, doctorNameParam?: string) => {
    try {
      let name = '';
      let isEmergency = false;
      let doctorName = '';
      let phone = '';
      let age: any = undefined;
      let gender = '';
      let problemDescription = '';

      if (typeof inputOrName === 'object' && inputOrName !== null) {
        name = inputOrName.name || '';
        isEmergency = !!inputOrName.isEmergency;
        doctorName = inputOrName.doctorName || '';
        phone = inputOrName.phone || '';
        age = inputOrName.age;
        gender = inputOrName.gender || '';
        problemDescription = inputOrName.problemDescription || '';
      } else {
        name = inputOrName || '';
        isEmergency = !!isEmergencyParam;
        doctorName = doctorNameParam || '';
      }

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isEmergency, doctorName, phone, age, gender, problemDescription })
      });
      if (res.ok) await fetchStateDirect();
    } catch (err) {
      console.error("Mutation failed: Add Patient", err);
    }
  };

  const handleCallNext = async () => {
    try {
      const res = await fetch('/api/call-next', { method: 'PUT' });
      if (res.ok) await fetchStateDirect();
    } catch (err) {
      console.error("Mutation failed: Call Next", err);
    }
  };

  const handleUpdatePatientStatus = async (id: string, status: 'waiting' | 'called' | 'completed') => {
    try {
      const res = await fetch(`/api/patients/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) await fetchStateDirect();
    } catch (err) {
      console.error("Mutation failed: Update Patient Status", err);
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchStateDirect();
    } catch (err) {
      console.error("Mutation failed: Delete Patient", err);
    }
  };

  const handleUpdateSettings = async (consultationTime: number) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationTime })
      });
      if (res.ok) await fetchStateDirect();
    } catch (err) {
      console.error("Mutation failed: Save Settings", err);
    }
  };

  const handleResetQueue = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) await fetchStateDirect();
    } catch (err) {
      console.error("Mutation failed: Reset Operations", err);
    }
  };

  // Derive global statistics counters
  const waitingCount = patients.filter(p => p.status === 'waiting').length;
  const completedCount = patients.filter(p => p.status === 'completed').length;
  const currentToken = settings.currentToken || 0;

  // Active navigation items matching structural specification
  const getNavbarLinks = () => {
    if (!user) return [];
    if (user.role === 'doctor') {
      return [
        { name: 'Dashboard', id: 'dashboard' },
        { name: 'Patient Queue', id: 'patient-queue' },
        { name: 'Completed Patients', id: 'completed-patients' },
        { name: 'Patient History', id: 'patient-history' },
        { name: '📺 Lobby Monitor', id: 'live-tv-monitor' },
        { name: 'Profile', id: 'profile' }
      ];
    } else if (user.role === 'receptionist') {
      return [
        { name: 'Dashboard', id: 'dashboard' },
        { name: 'Add Patient', id: 'add-patient' },
        { name: 'Manage Queue', id: 'manage-queue' },
        { name: 'Completed Patients', id: 'completed-patients' },
        { name: 'Search Patient', id: 'search-patient' },
        { name: '📺 Lobby Monitor', id: 'live-tv-monitor' },
        { name: 'Profile', id: 'profile' }
      ];
    }
    return [];
  };

  const getRoleTheme = () => {
    if (!user) return { color: 'sky', bg: 'bg-sky-50 text-sky-700 border-sky-100' };
    if (user.role === 'doctor') return { color: 'teal', bg: 'bg-teal-50 text-teal-700 border-teal-100' };
    if (user.role === 'receptionist') return { color: 'blue', bg: 'bg-sky-50 text-sky-700 border-sky-100' };
    return { color: 'sky', bg: 'bg-sky-50 text-sky-700 border-sky-100' };
  };

  // Dedicated real-time lobby monitor mode (without requiring user login sessions)
  if (viewMonitor) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4 sm:p-6 md:p-8 select-none transition-colors">
        <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-stretch">
          <div className="mb-4 flex justify-between items-center bg-slate-950 p-3 px-5 rounded-2xl border border-slate-800/80 shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-505 pulse-neutral-blue shrink-0 animate-ping" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Live Lobby TV Monitor View Active</span>
            </div>
            <button
              onClick={() => {
                setViewMonitor(false);
                window.history.pushState({}, '', window.location.origin);
              }}
              className="text-xs text-slate-300 hover:text-white px-3.5 py-1.5 bg-slate-1000/30 hover:bg-slate-850 rounded-xl border border-slate-800 transition-all cursor-pointer font-bold shadow-sm"
            >
              Exit Monitor View ⬅
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-stretch">
            <WaitingRoomDisplay patients={patients} settings={settings} />
          </div>
        </div>
      </div>
    );
  }

  // Render routing based on credentials
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-200">
          <AuthPanel 
            onLoginSuccess={handleLoginSuccess} 
            onLaunchMonitor={() => setViewMonitor(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-sky-100 selection:text-sky-800">
      
      {/* Decorative ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-sky-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-teal-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Fixed Top Pristine Healthcare Navigation Bar */}
      <nav id="top_fixed_navbar" className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-sky-500/10">
            <HeartPulse className="w-5 h-5 text-white" />
          </span>
          <div className="text-left">
            <h1 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
              Queue Cure
              <span className="text-[9px] bg-sky-50 text-sky-700 font-mono px-2 py-0.5 rounded-full border border-sky-100 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-neutral-blue" /> CLINIC LIVE
              </span>
            </h1>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Hospital Management Desk</p>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-1">
          {getNavbarLinks().map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                activeTab === link.id
                  ? 'bg-sky-50 text-sky-700 border border-sky-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {link.name}
            </button>
          ))}
        </div>

        {/* User Badge, Avatar and Dropdown Trigger */}
        <div className="hidden lg:flex items-center gap-4 relative">
          
          <div className="h-4 w-px bg-slate-200" />

          {/* User profile toggle */}
          <div 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-slate-50 rounded-xl transition-colors select-none group"
          >
            <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200/50 flex items-center justify-center text-sky-700 font-bold font-mono text-xs uppercase transition-colors">
              {user.name.charAt(0)}
            </div>
            
            <div className="text-left leading-tight">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                {user.name} {user.role === 'doctor' && '👨‍⚕️'}
              </div>
              <span className={`text-[8px] uppercase font-bold tracking-wider font-mono px-1.5 py-0.2 rounded border inline-block mt-0.5 ${getRoleTheme().bg}`}>
                {user.role}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
          </div>

          {/* Profile Dropdown Container */}
          {profileDropdownOpen && (
            <div className="absolute right-0 top-14 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800">
              <div className="px-3 py-2 border-b border-slate-100 mb-1 text-slate-400 text-[10px] uppercase font-mono font-bold tracking-wider block">
                Workspace Actions
              </div>
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setProfileDropdownOpen(false);
                }}
                className="w-full text-left rounded-xl text-xs font-semibold px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setProfileDropdownOpen(false);
                }}
                className="w-full text-left rounded-xl text-xs font-semibold px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-sky-600" />
                <span>Settings</span>
              </button>
              <div className="h-px bg-slate-100 my-1.5" />
              <button
                onClick={() => {
                  handleLogout();
                  setProfileDropdownOpen(false);
                }}
                className="w-full text-left rounded-xl text-xs font-bold px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Logout</span>
              </button>
            </div>
          )}

        </div>

        {/* Hamburger Mobile Menu toggle */}
        <div className="flex lg:hidden items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all focus:outline-none cursor-pointer flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu container */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bg-white border-b border-slate-200 p-5 z-40 lg:hidden text-left flex flex-col gap-4 animate-in slide-in-from-top duration-200 shadow-lg text-slate-800">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-full bg-sky-150 border border-sky-100 flex items-center justify-center text-sky-700 font-bold font-mono text-sm uppercase">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {user.name} {user.role === 'doctor' && '👨‍⚕️'}
              </p>
              <span className={`text-[8px] uppercase font-bold tracking-wider font-mono px-2 py-0.2 rounded border inline-block mt-0.5 ${getRoleTheme().bg}`}>
                {user.role}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            {getNavbarLinks().map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  setActiveTab(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left p-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
                  activeTab === link.id
                    ? 'bg-sky-55 text-sky-700 border border-sky-100 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="h-px bg-slate-100" />

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setActiveTab('profile');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-sky-600" />
              <span>System Settings</span>
            </button>
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Core content view container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
        
        {/* Soothing Healthcare Welcome Banner */}
        {activeTab === 'dashboard' && (
          <header id="welcome_back_header" className="bg-gradient-to-r from-sky-600 via-[#0369a1] to-teal-700 rounded-3xl p-7 relative overflow-hidden text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md shadow-sky-900/10 text-white">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[35px] pointer-events-none animate-pulse" />
            
            <div className="space-y-3">
              <span className="text-[10px] bg-white/20 text-white font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                Clinic Care Hub Live
              </span>
              <div className="space-y-1">
                <span className="text-xs text-sky-100 font-medium block">Welcome Back,</span>
                <h2 id="welcome_user_title" className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  {user.role === 'doctor' ? `Dr. ${user.name.replace('Dr.', '').trim()}` : user.name}
                  <span className="text-lg">👋</span>
                </h2>
                {user.role === 'doctor' && (
                  <p className="text-xs text-teal-100 font-semibold uppercase font-mono tracking-wider">
                     {user.specialization || "Cardiology Specialist Consultant"}
                  </p>
                )}
                {user.role === 'receptionist' && (
                  <p className="text-xs text-sky-100 font-semibold uppercase font-mono tracking-wider">
                    Frontdesk Clinic Reception Director
                  </p>
                )}
              </div>
            </div>

            {/* Quick Clinic Context Stats */}
            <div className="flex flex-wrap gap-4 items-center self-stretch md:self-auto justify-between md:justify-end">
              {user.role === 'doctor' && (
                <div className="p-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl min-w-[150px] text-center transition-all">
                  <span className="text-[10px] text-sky-150 uppercase font-bold tracking-wider">Your Appts Today</span>
                  <div className="text-2xl font-mono font-bold text-white mt-1">
                    {patients.filter(p => {
                      const docNameClean = user.name.toLowerCase().replace('dr.', '').trim();
                      return p.doctorName.toLowerCase().includes(docNameClean);
                    }).length} Patients
                  </div>
                </div>
              )}
              {user.role === 'receptionist' && (
                <div className="p-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl min-w-[150px] text-center transition-all">
                  <span className="text-[10px] text-sky-150 uppercase font-bold tracking-wider">Live Queue Count</span>
                  <div className="text-2xl font-mono font-bold text-white mt-1">
                    {waitingCount} Pending
                  </div>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Real-time Statistics Cards Row - Clean White Cards with Soft Slate Shadows */}
        {user.role === 'receptionist' && activeTab === 'dashboard' && (
          <section id="statistics_row" className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in duration-200 text-left">
            
            {/* Card 1: Current Active Token */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-[25px] pointer-events-none" />
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Current Serving Token</span>
                  <div id="stat_current_token" className="text-3xl font-mono font-extrabold text-sky-600 tracking-tight">
                    {currentToken > 0 ? `# ${currentToken}` : 'No Active Patient'}
                  </div>
                </div>
                <span className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                The token currently inside the physician's chamber.
              </p>
            </div>

            {/* Card 2: Waiting Patients */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-[25px] pointer-events-none" />
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Waiting Lounge</span>
                  <div id="stat_waiting_count" className="text-3xl font-mono font-extrabold text-slate-800 tracking-tight">
                    {waitingCount} <span className="text-sm font-sans font-normal text-slate-400">Patients</span>
                  </div>
                </div>
                <span className="p-3 bg-teal-55 text-teal-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                Registered outpatients currently seated in the live lounge.
              </p>
            </div>

            {/* Card 3: Dispatched Patients */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[25px] pointer-events-none" />
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Completed Consultations</span>
                  <div id="stat_completed_count" className="text-3xl font-mono font-extrabold text-slate-800 tracking-tight">
                    {completedCount} <span className="text-sm font-sans font-normal text-slate-400">Today</span>
                  </div>
                </div>
                <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                Prescriptions dispatched and appointments fully finalized.
              </p>
            </div>

          </section>
        )}

        {/* Dynamic Role Dashboard Tab Selection */}
        <div className="w-full">
          {activeTab === 'live-tv-monitor' ? (
            <div className="max-w-6xl mx-auto space-y-5 text-left animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <span>Lobby TV Monitor Live Preview</span>
                    <span className="text-[10px] tracking-wider uppercase font-black px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">HQ Feed</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Real-time simulation layout and voice announcement testing module for clinic TVs or lobby monitors.</p>
                </div>
                <button
                  onClick={() => window.open('/?monitor=true', '_blank')}
                  className="px-4.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/10 transition-all cursor-pointer flex items-center gap-2 hover:translate-y-[-1px] active:translate-y-[0px]"
                >
                  <span>Open TV Screen in New Tab</span>
                  <span className="text-sm">↗</span>
                </button>
              </div>
              <WaitingRoomDisplay patients={patients} settings={settings} />
            </div>
          ) : (
            <>
              {user.role === 'doctor' && (
                <DoctorDashboard 
                  token={token} 
                  currentUser={user} 
                  patients={patients} 
                  onCallNext={handleCallNext} 
                  onUpdatePatientStatus={handleUpdatePatientStatus} 
                  onLogout={handleLogout} 
                  activeTab={activeTab}
                />
              )}

              {user.role === 'receptionist' && (
                <div className="space-y-8">
                  {activeTab === 'dashboard' ? (
                    /* Main Central Workspace Layout for Dashboard (Split Columns) */
                    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left Column: Receptionist Command Deck */}
                      <section id="receptionist_deck" className="lg:col-span-7 space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Reception Desk & Registry</h2>
                        </div>
                        <ReceptionistDashboard
                          patients={patients}
                          settings={settings}
                          onAddPatient={handleAddPatient}
                          onCallNext={handleCallNext}
                          onUpdatePatientStatus={handleUpdatePatientStatus}
                          onDeletePatient={handleDeletePatient}
                          onUpdateSettings={handleUpdateSettings}
                          activeTab="dashboard"
                          currentUser={user}
                        />
                      </section>

                      {/* Right Column: Patient Display monitor & Analytics panel */}
                      <section id="patient_deck" className="lg:col-span-5 space-y-6">
                        <PatientViewDashboard
                          patients={patients}
                          settings={settings}
                          selectedToken={selectedToken}
                          setSelectedToken={setSelectedToken}
                        />

                        <AnalyticsPanel
                          analytics={analytics}
                          patients={patients}
                          onReset={handleResetQueue}
                        />
                      </section>

                    </main>
                  ) : (
                    /* Centralized focused layout for other detailed sub-pages */
                    <main className="max-w-4xl mx-auto">
                      <ReceptionistDashboard
                        patients={patients}
                        settings={settings}
                        onAddPatient={handleAddPatient}
                        onCallNext={handleCallNext}
                        onUpdatePatientStatus={handleUpdatePatientStatus}
                        onDeletePatient={handleDeletePatient}
                        onUpdateSettings={handleUpdateSettings}
                        activeTab={activeTab}
                        onLogout={handleLogout}
                        currentUser={user}
                      />
                    </main>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Elegant Minimal Footer */}
        <footer className="pt-12 border-t border-slate-200 text-center text-[10px] text-slate-450 font-mono tracking-wider uppercase">
          QUEUE CURE HOSPITAL PLATFORM • HEALTHCARE MANAGEMENT SYSTEM • ALL SYSTEMS ACTIVE
        </footer>

      </div>
    </div>
  );
}
