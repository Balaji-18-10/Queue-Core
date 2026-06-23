import React, { useState, useEffect } from 'react';
import { Patient, QueueSettings } from '../types';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Clock, 
  Layers, 
  CheckCircle, 
  ChevronRight,
  UserCircle2,
  Stethoscope,
  Sparkles,
  HelpCircle,
  BellRing
} from 'lucide-react';

interface PatientViewProps {
  patients: Patient[];
  settings: QueueSettings;
  selectedToken: number | null;
  setSelectedToken: (token: number | null) => void;
}

export const PatientViewDashboard: React.FC<PatientViewProps> = ({ 
  patients, 
  settings, 
  selectedToken,
  setSelectedToken 
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const currentToken = settings.currentToken || 0;
  const consultationTime = settings.consultationTime || 10;
  
  // Filter out waiting patients
  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const activePatient = patients.find(p => p.token === selectedToken);

  // Auto-select based on window location search query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      const tokVal = parseInt(tokenParam, 10);
      if (!isNaN(tokVal) && patients.some(p => p.token === tokVal)) {
        setSelectedToken(tokVal);
      }
    }
  }, [patients]);

  // Generate QR code data URL whenever selected token changes
  useEffect(() => {
    if (selectedToken !== null) {
      const url = `${window.location.origin}?token=${selectedToken}`;
      QRCode.toDataURL(url, {
        margin: 1.5,
        width: 130,
        color: {
          dark: '#1e293b', // Dark slate for pixel values
          light: '#ffffff' // Crisp white background for high accessibility
        }
      })
      .then(urlData => {
        setQrCodeUrl(urlData);
      })
      .catch(err => {
        console.error("QR Code generation error", err);
      });
    } else {
      setQrCodeUrl('');
    }
  }, [selectedToken]);

  // Calculate Tokens Ahead and Estimated wait time
  const tokensAhead = selectedToken !== null 
    ? Math.max(selectedToken - currentToken - 1, 0)
    : 0;

  const estimatedWait = tokensAhead * consultationTime;

  // Track status tier
  const getStatusStep = () => {
    if (!activePatient) return 0;
    if (activePatient.status === 'completed') return 3;
    if (activePatient.status === 'called') return 2;
    return 1; // 'waiting'
  };

  const statusStep = getStatusStep();

  return (
    <div className="bg-white border border-slate-205 p-6 rounded-2xl relative overflow-hidden space-y-6 text-slate-800 shadow-sm text-left">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full blur-[40px] pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 inline-block mb-1">
            Patient Portal
          </span>
          <h2 className="text-xl font-extrabold text-slate-850">Live Patient View Monitor</h2>
        </div>
      </div>

      {/* Token Selector form */}
      <div className="space-y-2 text-left">
        <label className="block text-xs font-bold text-slate-500">Select Registered Token to Monitor:</label>
        <div id="patient_token_dropdown_container" className="flex gap-2">
          <select
            id="patient_token_select"
            value={selectedToken || ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedToken(val ? parseInt(val, 10) : null);
            }}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 cursor-pointer font-sans"
          >
            <option value="">-- Choose Your registered Token passcode --</option>
            {patients
              .sort((a,b) => a.token - b.token)
              .map((p) => (
                <option key={p._id} value={p.token}>
                  Token #{p.token} - {p.name} {p.status === 'completed' ? '✓ Discharged' : p.status === 'called' ? '⚡ Calling Cabin' : '⏳ Waiting'}
                </option>
              ))
            }
          </select>
          {selectedToken !== null && (
            <button
              onClick={() => setSelectedToken(null)}
              className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Monitoring Screen */}
      {selectedToken !== null && activePatient ? (
        <div id="patient_personal_card" className="space-y-6 text-left">
          
          {/* Quick Alert if called */}
          {activePatient.status === 'called' && (
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-center gap-3.5 shadow-sm text-emerald-800">
              <span className="p-2.5 bg-emerald-100 rounded-full text-emerald-700">
                <BellRing className="w-5 h-5 animate-bounce shrink-0" />
              </span>
              <div className="text-left">
                <span className="text-[10px] text-emerald-850 uppercase font-mono tracking-widest font-extrabold">Your Call has Arrived!</span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">Please proceed inside to {activePatient.doctorName} immediately.</p>
              </div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Tokens Ahead Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Tokens Ahead</span>
              </div>
              <div id="patient_stat_tokens_ahead" className="text-2xl font-mono font-bold text-slate-800 mt-2">
                {activePatient.status === 'waiting' ? tokensAhead : '0'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {activePatient.status === 'waiting' ? `${tokensAhead} patients ahead` : 'In Consultation'}
              </span>
            </div>

            {/* Est Waiting Time */}
            <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Est. Wait Time</span>
              </div>
              <div id="patient_stat_estimated_wait" className="text-2xl font-mono font-extrabold text-[#0284C7] mt-2">
                {activePatient.status === 'waiting' ? `${estimatedWait} Mins` : '0 Mins'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Live pacing system duration
              </span>
            </div>

            {/* Selected Token */}
            <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase">
                <UserCircle2 className="w-4 h-4 text-slate-430" />
                <span>My Token pass</span>
              </div>
              <div className="text-2xl font-mono font-bold text-slate-800 mt-2">
                #{activePatient.token}
              </div>
              <span className="text-[10px] text-slate-500 font-bold block mt-1 truncate">
                {activePatient.name}
              </span>
            </div>

            {/* Assigned Specialist */}
            <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold uppercase">
                <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                <span>Specialist MD</span>
              </div>
              <div className="text-xs text-slate-800 truncate font-extrabold mt-2 leading-none">
                {activePatient.doctorName}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Primary healthcare assignee
              </span>
            </div>

          </div>

          {/* Stepper Progress bar tracker */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-450 block">Treatment Milestones Timeline</span>
            
            <div id="patient_steps_timeline" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1 text-left">
              
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs font-bold transition-all ${
                  statusStep >= 1 ? 'bg-sky-50 text-sky-700 border-sky-305' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  1
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${statusStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Registration Done</h4>
                  <p className="text-[10px] text-slate-500">Slot locked in stream</p>
                </div>
              </div>

              <ChevronRight className="hidden sm:block w-4 h-4 text-slate-350" />

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs font-bold transition-all ${
                  statusStep === 2 ? 'bg-sky-600 text-white border-sky-700 shadow-sm animate-pulse' : statusStep > 2 ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  2
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${statusStep >= 2 ? 'text-[#0284C7]' : 'text-slate-400'}`}>Physician Admission</h4>
                  <p className="text-[10px] text-slate-500">Go to medical cabin</p>
                </div>
              </div>

              <ChevronRight className="hidden sm:block w-4 h-4 text-slate-355" />

              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs font-bold transition-all ${
                  statusStep >= 3 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  3
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${statusStep >= 3 ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}`}>Session Completed</h4>
                  <p className="text-[10px] text-slate-500">Prescription locked</p>
                </div>
              </div>

            </div>
          </div>

          {/* QR Code and Wallet Sync Option */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
            {qrCodeUrl ? (
              <div id="patient_qr_container" className="bg-white p-2 border border-slate-200 rounded-xl shrink-0">
                <img referrerPolicy="no-referrer" src={qrCodeUrl} alt="Offline QR Token" className="w-[110px] h-[110px]" />
              </div>
            ) : (
              <div className="w-[110px] h-[110px] bg-slate-100 rounded-xl animate-pulse shrink-0 border border-slate-200" />
            )}
            
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sky-705">
                <QrCode className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Dynamic Ticket Passport QR</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Scan this code with your smartphone camera to load your personal consulting status in real-time. This lets you wait comfortably in our cafeteria or outside garden lounge!
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-[9.5px] text-slate-500 bg-white py-1 px-2.5 border border-slate-200 rounded-md self-start w-fit">
                <Sparkles className="w-3 h-3 text-sky-655" />
                <span>Matches clinic master console perfectly</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div id="blank_patient_view_state" className="py-16 px-6 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50 text-slate-500">
          <HelpCircle className="w-8 h-8 text-slate-350 mx-auto" />
          <div className="space-y-1 text-center">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase">No Patient Token Loaded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Kindly choose your registered name or ticket number from the selector box above to track live wait progressions and milestones alerts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
