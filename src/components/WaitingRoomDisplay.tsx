import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Clock, 
  Calendar, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Users, 
  HelpCircle, 
  ShieldAlert, 
  Activity,
  UserCheck,
  Building,
  HeartPulse,
  Info,
  Settings,
  Sliders,
  Play
} from 'lucide-react';
import { Patient, QueueSettings } from '../types';

interface WaitingRoomDisplayProps {
  patients: Patient[];
  settings: QueueSettings;
}

// Map doctors to their designated consultation chambers
const getDoctorRoom = (doctorName: string): string => {
  const cleanName = doctorName.toLowerCase().replace('dr.', '').trim();
  if (cleanName.includes('jenkins') || cleanName.includes('sarah')) {
    return 'Room 101';
  }
  if (cleanName.includes('patel') || cleanName.includes('alex')) {
    return 'Room 102';
  }
  if (cleanName.includes('vance') || cleanName.includes('eleanor')) {
    return 'Room 103';
  }
  if (cleanName.includes('kumar') || cleanName.includes('rajesh')) {
    return 'Room 104';
  }
  // Dynamic deterministic routing based on doctor name to prevent blank labels
  let hash = 0;
  for (let i = 0; i < doctorName.length; i++) {
    hash = doctorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const roomNum = 100 + (Math.abs(hash) % 15) + 1; // Room 101 to Room 115
  return `Room ${roomNum}`;
};

export const WaitingRoomDisplay: React.FC<WaitingRoomDisplayProps> = ({ 
  patients, 
  settings 
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Persistence state
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('qc_lounge_voice_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [speechRate, setSpeechRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('qc_lounge_speech_rate');
      return saved !== null ? parseFloat(saved) : 0.85;
    } catch {
      return 0.85;
    }
  });
  
  // Track already-announced called tokens to prevent repetitive vocal loops
  const announcedTokensRef = useRef<Set<string>>(new Set());

  // Fullscreen support state & functions
  const rootContainerRef = useRef<HTMLDivElement>(null);

  // Maintain real-time clock tickers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qc_lounge_voice_enabled', String(voiceEnabled));
    } catch (e) {
      console.warn('LocalStorage blocked or unavailable:', e);
    }
  }, [voiceEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('qc_lounge_speech_rate', String(speechRate));
    } catch (e) {
      console.warn('LocalStorage blocked or unavailable:', e);
    }
  }, [speechRate]);

  // Filter queue records
  const calledPatients = patients.filter(p => p.status === 'called');
  
  // Outstanding waiting queue order
  const waitingPatients = patients
    .filter(p => p.status === 'waiting')
    .sort((a, b) => a.token - b.token);

  // The very top called patient represents the current main token
  const primaryCalledPatient = calledPatients[calledPatients.length - 1] || null;

  // Next 3 waiting tokens
  const nextTokens = waitingPatients.slice(0, 3);

  // Emergency is active if any called patient is emergency
  const activeEmergencyPatient = calledPatients.find(p => p.isEmergency);

  // Test current configuration with a simulation voice readout
  const testVoiceAnnouncement = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const demoToken = primaryCalledPatient 
        ? (primaryCalledPatient.tokenNumberString || `QC${String(primaryCalledPatient.token).padStart(3, '0')}`)
        : "QC101";

      const rName = primaryCalledPatient ? primaryCalledPatient.doctorName : "Dr. Sarah Jenkins";
      const room = getDoctorRoom(rName);

      const speechText = `Token Number ${demoToken.split('').join(' ')}, Please Proceed to Doctor, ${rName}, at ${room}`;
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = speechRate;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google'));
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech option is not available in your current browser.");
    }
  };

  // Voice announcements triggers on patient status updates
  useEffect(() => {
    if (calledPatients.length === 0 || !voiceEnabled) return;

    calledPatients.forEach(patient => {
      const parentToken = patient.tokenNumberString || `QC${String(patient.token).padStart(3, '0')}`;
      const uniqueAnnouncementId = `${parentToken}_${patient.status}`;

      if (!announcedTokensRef.current.has(uniqueAnnouncementId)) {
        announcedTokensRef.current.add(uniqueAnnouncementId);

        // Build elegant medical notification text
        const room = getDoctorRoom(patient.doctorName);
        const speechText = `Token Number ${parentToken.split('').join(' ')}, Please Proceed to Doctor, ${patient.doctorName}, at ${room}`;
        
        // Execute speech synthesis with nice timing configuration
        if ('speechSynthesis' in window) {
          // Cancel any active queues to prioritize the latest call
          window.speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.rate = speechRate; // Slow, legible clinical announcement rate
          utterance.pitch = 1.0;
          
          // Select a professional-sounding default voice if possible
          const voices = window.speechSynthesis.getVoices();
          const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google'));
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
          
          window.speechSynthesis.speak(utterance);
        }
      }
    });

  }, [patients, voiceEnabled, speechRate]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!rootContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      rootContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Error attempting to activate fullscreen", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error("Error exiting fullscreen", err));
    }
  };

  // Keep fullscreen state in sync with key escape/screen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={rootContainerRef}
      className="w-full bg-slate-900 border border-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[85vh] font-sans"
    >
      {/* Top Banner: Emergency Alert Area */}
      {activeEmergencyPatient && (
        <div className="bg-rose-600 animate-pulse py-4 px-6 flex items-center justify-center gap-3 border-b-2 border-rose-800 text-center z-10 shrink-0">
          <ShieldAlert className="w-8 h-8 text-white shrink-0 animate-bounce" />
          <div className="text-left">
            <h2 className="text-lg font-black uppercase tracking-widest text-white leading-none">
              🚨 Emergency Patient Called
            </h2>
            <p className="text-xs text-rose-100 font-bold mt-1">
              Patient: <span className="font-extrabold underline">{activeEmergencyPatient.name}</span> ({activeEmergencyPatient.tokenNumberString || `QC${String(activeEmergencyPatient.token).padStart(3, '0')}`}) — Proceed to {getDoctorRoom(activeEmergencyPatient.doctorName)} immediately.
            </p>
          </div>
        </div>
      )}

      {/* Real-time Header Display with full status controls */}
      <div className="bg-slate-950 px-6 sm:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
            <HeartPulse className="w-6 h-6 text-white animate-pulse" />
          </span>
          <div className="text-left">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              Queue Cure WAIT LOUNGE
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Healthcare Waiting Stream</p>
          </div>
        </div>

        {/* Date and Time tickers */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2 text-sky-400">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold font-mono">
              {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2 text-sky-400">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black font-mono tracking-wide">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>

          {/* Interactive Utility Commands */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-805">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? "Mute Voice Announcements" : "Unmute Voice Announcements"}
              className={`p-2 rounded-lg cursor-pointer transition-all ${!voiceEnabled ? 'text-rose-450 hover:bg-slate-800' : 'text-emerald-450 hover:bg-slate-800'}`}
            >
              {!voiceEnabled ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              title="Voice & Monitor Configuration"
              className={`p-2 rounded-lg cursor-pointer transition-all ${showSettings ? 'text-sky-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen Monitor" : "Enter Fullscreen Monitor"}
              className="p-2 text-sky-450 hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Monitor Settings Panel */}
      {showSettings && (
        <div className="bg-slate-950 border-b border-slate-800/80 p-6 animate-in slide-in-from-top duration-200">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            
            {/* Column 1: Voice Announcement Parameters */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-500 animate-pulse" />
                <span>Text-to-Speech Settings</span>
              </h3>
              
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white block">Voice Announcements</label>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Read called outpatient tokens aloud</span>
                  </div>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      voiceEnabled ? 'bg-sky-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        voiceEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white">Playback Announcement Speed</label>
                    <span className="text-xs font-mono font-black text-emerald-450 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                      {speechRate.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    disabled={!voiceEnabled}
                    className="w-full accent-sky-500 disabled:opacity-40 cursor-pointer bg-slate-950 h-1.5 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider px-1">
                    <span>🐢 Slow (0.5x)</span>
                    <span className="text-sky-400">Normal (0.85x)</span>
                    <span>⚡ Faster (1.8x)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Voice Test & Troubleshooting utilities */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-500" />
                  <span>Interactive Audio Test</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
                  Verify the speaker setup and hear how clinical token announcements sound inside the waiting lobby.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 mt-2">
                <button
                  type="button"
                  onClick={testVoiceAnnouncement}
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:translate-y-[-1px] active:scale-[0.98] text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 tracking-wider uppercase transition-all shadow-md shadow-emerald-500/10 cursor-pointer shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Test Pronunciation</span>
                </button>
                <div className="text-left text-[10px] text-slate-400 leading-relaxed font-medium">
                  📢 <strong className="text-white">Sample Script:</strong> "Token Number QC101 Please Proceed to Doctor..."
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Screen Layout Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 bg-slate-900 overflow-y-auto">
        
        {/* Left Side: Current Serving / Token highlight (Large display) */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-6">
          <div className="bg-slate-950/80 border border-slate-800/80 p-8 rounded-3xl flex-1 flex flex-col justify-center text-center relative overflow-hidden shadow-inner">
            <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-15%] left-[-10%] w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="space-y-4">
              <span className="text-xs sm:text-sm font-sans font-extrabold uppercase tracking-[0.25em] text-slate-400">
                Current Serving Patient
              </span>
              
              {primaryCalledPatient ? (
                <div className="space-y-6">
                  {/* Token text */}
                  <div className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-sky-450 font-mono select-all animate-pulse drop-shadow-[0_0_20px_rgba(56,189,248,0.15)] leading-tight">
                    {primaryCalledPatient.tokenNumberString || `QC${String(primaryCalledPatient.token).padStart(3, '0')}`}
                  </div>

                  {/* Doctor Info Block */}
                  <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1 shadow-md">
                    <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block">Assigned Physician</span>
                    <strong className="text-xl sm:text-2xl font-extrabold text-white block truncate">
                      {primaryCalledPatient.doctorName}
                    </strong>
                    <div className="pt-2 flex justify-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-black uppercase rounded-md font-mono tracking-wider">
                        <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {getDoctorRoom(primaryCalledPatient.doctorName)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-slate-450 space-y-4">
                  <Activity className="w-16 h-16 mx-auto text-slate-600 animate-spin" />
                  <p className="text-lg font-bold">All Patients Served or Lounge Empty</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    New clinic outpatients added at the receptionist desk will pop up here instantly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ledger of Other Currently Active Consulting Rooms (In case of parallel physician shifts) */}
          {calledPatients.length > 1 && (
            <div className="bg-slate-950/40 border border-slate-805 p-5 rounded-2xl text-left">
              <h3 className="text-xs font-sans font-extrabold text-slate-405 uppercase tracking-wider mb-3">
                Other Active Doctor Rooms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {calledPatients
                  .filter(p => !primaryCalledPatient || p._id !== primaryCalledPatient._id)
                  .map(p => (
                    <div key={p._id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                      <div>
                        <div className="text-[9px] font-bold text-slate-405 uppercase leading-none">Chamber Desk</div>
                        <div className="text-xs font-black text-white mt-1">{p.doctorName}</div>
                        <div className="text-[10px] text-emerald-450 font-bold mt-0.5">{getDoctorRoom(p.doctorName)}</div>
                      </div>
                      <div className="text-xl font-mono font-black text-sky-400 tracking-tight">
                        {p.tokenNumberString || `QC${String(p.token).padStart(3, '0')}`}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Next Tokens Queue + Summary Metrics */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-6">
          
          {/* Next Tokens board */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-6 sm:p-7 rounded-3xl text-left space-y-5 shadow-sm">
            <h3 className="text-xs sm:text-sm font-sans font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>Next in Line</span>
              <span className="text-[9px] bg-slate-900 border border-slate-800 px-3 py-0.5 rounded-full text-slate-450">Queue</span>
            </h3>

            {nextTokens.length > 0 ? (
              <div className="space-y-3.5">
                {nextTokens.map((pat, idx) => (
                  <div 
                    key={pat._id} 
                    className="bg-slate-900/60 border border-slate-805 hover:bg-slate-900 p-4 rounded-2xl flex items-center justify-between shadow-xs transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-450 font-mono">
                        {idx + 1}
                      </div>
                      <div>
                        {/* Blur customer names/lastnames on monitors slightly for patient HIPAA privacy, but show initial cleanly */}
                        <div className="text-sm font-bold text-white tracking-wide">
                          {pat.name.split(' ')[0]} {pat.name.split(' ')[1] ? pat.name.split(' ')[1].charAt(0) + '...' : ''}
                        </div>
                        <div className="text-[10px] text-slate-450 mt-0.5 font-semibold">
                          Dr. {pat.doctorName.replace('Dr.', '').trim()}
                        </div>
                      </div>
                    </div>

                    <div className="text-xl font-mono font-black text-emerald-450 tracking-tight">
                      {pat.tokenNumberString || `QC${String(pat.token).padStart(3, '0')}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-medium space-y-2">
                <p>No waiting patients in queue.</p>
                <p className="text-[10px] text-slate-600">Receptionist registry is ready for next logins.</p>
              </div>
            )}

            {/* If there are more waiting patients that don't fit the next 3 list */}
            {waitingPatients.length > 3 && (
              <div className="text-[10px] text-slate-455 text-center font-bold font-mono tracking-wider bg-slate-900/30 p-2 border border-slate-800/40 rounded-xl leading-relaxed">
                + {waitingPatients.length - 3} MORE PATIENTS IN THE WAITING LINE
              </div>
            )}
          </div>

          {/* Stats: Waiting Lounge metrics */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-6 rounded-3xl text-left space-y-4">
            <h4 className="text-[10px] uppercase font-bold text-slate-405 tracking-widest block">Waiting Lounge Summary</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3 text-sky-500" /> Pending Count
                </span>
                <div className="text-2xl font-mono font-black text-white">
                  {waitingPatients.length}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-500" /> Dispatched
                </span>
                <div className="text-2xl font-mono font-black text-white">
                  {patients.filter(p => p.status === 'completed').length}
                </div>
              </div>
            </div>

            {/* Footer tips */}
            <div className="text-[10px] text-slate-500 bg-slate-900/20 p-2.5 rounded-xl flex items-start gap-1.5 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
              <span>Please carry your paper outpatient ticket coupon. Watch this monitor, and proceed immediately once your exact Ticket ID turns blue.</span>
            </div>
          </div>

        </div>

      </div>

      {/* Screen Footer */}
      <footer className="bg-slate-950 border-t border-slate-805 py-3 px-6 text-center text-[10px] text-slate-505 font-mono tracking-wider uppercase shrink-0">
        All Clinic Consultation updates dynamically refresh in real-time. Power by Queue Cure EMR Core v2.6.
      </footer>
    </div>
  );
};
