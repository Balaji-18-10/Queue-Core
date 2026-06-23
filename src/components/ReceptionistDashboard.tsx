import React, { useState } from 'react';
import { Patient, QueueSettings } from '../types';
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Play, 
  Check, 
  RotateCcw, 
  Settings2, 
  ShieldAlert, 
  HelpCircle,
  Clock,
  Calendar,
  UserCheck2,
  Stethoscope,
  ChevronRight,
  Filter,
  Users,
  Activity,
  Maximize2,
  UserCheck,
  Zap,
  Sliders,
  Sparkles,
  Award,
  ChevronUp,
  ChevronDown,
  Edit
} from 'lucide-react';

interface ReceptionistDashboardProps {
  patients: Patient[];
  settings: QueueSettings;
  onAddPatient: (patientData: any) => void;
  onCallNext: () => void;
  onUpdatePatientStatus: (id: string, status: 'waiting' | 'called' | 'completed') => void;
  onDeletePatient: (id: string) => void;
  onUpdateSettings: (consultationTime: number) => void;
  activeTab?: string;
  onLogout?: () => void;
  currentUser?: { name: string; email: string };
}

const DOCTOR_PRESETS = [
  "Dr. Sarah Jenkins (GP)",
  "Dr. Alex Patel (Pediatrics)",
  "Dr. Eleanor Vance (Cardiology)",
  "Dr. Marcus Thorne (Orthopedics)"
];

export const ReceptionistDashboard: React.FC<ReceptionistDashboardProps> = ({
  patients,
  settings,
  onAddPatient,
  onCallNext,
  onUpdatePatientStatus,
  onDeletePatient,
  onUpdateSettings,
  activeTab = 'dashboard',
  onLogout,
  currentUser = { name: "Jane Doe", email: "receptionist@queuecure.com" }
}) => {
  // Local Form state
  const [patientName, setPatientName] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTOR_PRESETS[0]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [patientAge, setPatientAge] = useState('28');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Deletion prompt & success states
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Rescheduling state variables and helpers
  const [reschedulingPatient, setReschedulingPatient] = useState<Patient | null>(null);
  const [newApptDate, setNewApptDate] = useState('');
  const [newApptTime, setNewApptTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Editing state variables
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editName, setEditName] = useState('');
  const [editDoctor, setEditDoctor] = useState(DOCTOR_PRESETS[0]);
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editPhone, setEditPhone] = useState('');
  const [editEmergency, setEditEmergency] = useState(false);
  const [editProblemDescription, setEditProblemDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setEditError(null);

    // Validate editPhone (India (+91XXXXXXXXXX) shape check)
    const regex = /^\+91[6-9]\d{9}$/;
    if (!regex.test(editPhone)) {
      setEditError("Please enter a valid 10-digit Indian phone number starting with 6,7,8,9 (Format: +91XXXXXXXXXX)");
      return;
    }

    try {
      const res = await fetch(`/api/patients/${editingPatient._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          isEmergency: editEmergency,
          doctorName: editDoctor,
          age: editAge ? Number(editAge) : undefined,
          gender: editGender,
          phone: editPhone,
          problemDescription: editProblemDescription
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update patient metadata");
      }
      setSuccessMessage(`Patient record for "${editName}" updated successfully!`);
      setEditingPatient(null);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      setEditError(err.message);
    }
  };

  const formatTimeToAMPM = (time24: string): string => {
    if (!time24) return "10:30 AM";
    const [hourStr, minStr] = time24.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour.toString().padStart(2, '0')}:${minStr} ${ampm}`;
  };

  const formatDateToDDMMYYYY = (dateStr: string): string => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingPatient) return;
    setRescheduleError(null);

    const formattedDate = formatDateToDDMMYYYY(newApptDate);
    const formattedTime = formatTimeToAMPM(newApptTime);

    try {
      const res = await fetch(`/api/patients/${reschedulingPatient._id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentDate: formattedDate, appointmentTime: formattedTime })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reschedule appointment slot");
      }
      setSuccessMessage(`Patient "${reschedulingPatient.name}" rescheduled successfully to ${formattedTime}!`);
      setReschedulingPatient(null);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      setRescheduleError(err.message);
    }
  };

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');

  // Pacemaker timer configurations
  const [showSettings, setShowSettings] = useState(false);
  const [tempConsultationTime, setTempConsultationTime] = useState(settings.consultationTime);

  const confirmDelete = async () => {
    if (!patientToDelete) return;
    try {
      await onDeletePatient(patientToDelete._id);
      setSuccessMessage("Patient deleted successfully!");
      setPatientToDelete(null);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Delete patient failed:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!patientName.trim()) {
      setSubmitError("Patient name is required");
      return;
    }

    // Validate phone mapping (+91 prefix followed by 10 digits starting with [6-9])
    const regex = /^\+91[6-9]\d{9}$/;
    if (!regex.test(patientPhone)) {
      setSubmitError("Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9 (Format: +91XXXXXXXXXX)");
      return;
    }

    onAddPatient({
      name: patientName.trim(),
      isEmergency,
      doctorName: selectedDoctor,
      age: patientAge ? Number(patientAge) : undefined,
      gender: patientGender,
      phone: patientPhone,
      problemDescription: problemDescription.trim()
    });

    setSuccessMessage(`Patient "${patientName.trim()}" registered successfully!`);
    setPatientName('');
    setIsEmergency(false);
    setPatientAge('28');
    setPatientGender('Male');
    setPatientPhone('');
    setProblemDescription('');
    setSubmitError(null);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(tempConsultationTime);
    setSuccessMessage("Consultation pace duration updated successfully!");
    setShowSettings(false);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Helper filters
  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const calledPatients = patients.filter(p => p.status === 'called');
  const completedPatients = patients.filter(p => p.status === 'completed');

  // Next patient logic
  const nextWaitingPatient = [...waitingPatients].sort((a, b) => {
    if (a.isEmergency && !b.isEmergency) return -1;
    if (!a.isEmergency && b.isEmergency) return 1;
    return a.token - b.token;
  })[0];

  return (
    <div className="space-y-6 text-slate-800 text-left">
      
      {/* Toast Alert */}
      {successMessage && (
        <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-xl text-sky-750 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <Check className="w-4 h-4 text-sky-655" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* CONFIRMATION OVERLAY MODAL */}
      {patientToDelete && (
        <div id="modal_confirm_delete" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-xl relative text-slate-800">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </span>
              <div className="text-left">
                <h4 className="text-sm font-bold text-slate-850 uppercase">Confirm Discharge Passthrough</h4>
                <p className="text-[10px] text-slate-450">Deletes the patient token completely.</p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-left">
              <p className="text-xs text-slate-600 leading-relaxed">Are you confident you want to remove this patient?</p>
              <div className="flex justify-between items-center pt-1 font-mono">
                <span className="text-xs font-bold text-slate-800">{patientToDelete.name}</span>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded">Token #{patientToDelete.token}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-150 text-slate-650 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-colors"
              >
                Yes, Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW ACCORDING TO ACCOMPANIED TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-sky-600 via-[#0369a1] to-teal-700 border border-slate-200/50 rounded-2xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] bg-white/20 text-white font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                    RECEPTION COMMAND AREA
                  </span>
                  <span className="text-[10px] bg-sky-200/25 text-white font-semibold px-2 py-0.5 rounded-full border border-white/20">
                    Live Status Monitor
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white mt-2">Welcome Back, {currentUser.name}!</h2>
                <p className="text-xs text-sky-100 mt-1 max-w-xl">
                  Coordinate outpatient admissions, control general waiting streams, trigger priority emergency alerts, and adjust clinic consultation parameters.
                </p>
              </div>

              <div className="bg-white/10 border border-white/20 p-3.5 rounded-xl flex items-center gap-3 self-start md:self-auto">
                <span className="p-2 bg-white/10 text-white rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[9px] text-sky-100 font-bold block uppercase">Est Consultation Pace</span>
                  <span className="text-xs font-extrabold text-white font-mono">{settings.consultationTime} Minutes / Patient</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call Next Big Widget */}
          <div className="bg-[#f0f9ff]/70 border border-sky-105 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-[10px] text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full border border-sky-150 uppercase font-mono tracking-wider">
                Direct Recall Callout
              </span>
              <h3 className="text-lg text-slate-805 font-extrabold">Ready to call next patient?</h3>
              <p className="text-xs text-slate-550 leading-relaxed max-w-md font-sans">
                {nextWaitingPatient ? (
                  <span>
                    Admit next in line: <strong className="text-sky-700 font-mono font-black text-sm ml-1">Token #{nextWaitingPatient.token}</strong> — {nextWaitingPatient.name} 
                    {nextWaitingPatient.isEmergency && <span className="text-rose-600 font-extrabold ml-2 animate-pulse">(URGENT TRIAGE)</span>}
                  </span>
                ) : (
                  "All clear! No patients currently waiting in the lounge queue."
                )}
              </p>
            </div>

            <button
              id="btn_call_next_patient"
              onClick={onCallNext}
              disabled={!nextWaitingPatient}
              className={`px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 w-full md:w-auto ${
                nextWaitingPatient 
                  ? 'bg-sky-600 hover:bg-sky-700 text-white hover:translate-y-[-1px] active:translate-y-0' 
                  : 'bg-slate-100 border border-slate-200 text-slate-401 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 text-white fill-current shrink-0" />
              <span>Call Next Patient</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quick mini-forms register */}
            <div className="lg:col-span-12 xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-500 flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Quick Registration Desk</span>
                <span className="text-[9px] text-[#0284C7] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded font-mono">MANUAL ENTRY</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-bold">
                    {submitError}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Patient Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter full name..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Age (Years)</label>
                    <input
                      type="number"
                      min="1"
                      max="125"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Phone (+91 Indian format)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-mono text-xs font-bold">
                      +91
                    </span>
                    <input
                      type="text"
                      required
                      value={patientPhone.replace(/^\+91/, '')}
                      onChange={(e) => {
                        const inputDigits = e.target.value.replace(/\D/g, '');
                        const cleanDigits = inputDigits.substring(0, 10);
                        setPatientPhone(cleanDigits ? '+91' + cleanDigits : '');
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 rounded-xl py-2 pl-11 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 font-mono tracking-wider font-semibold animate-none"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono tracking-tight leading-none mt-1">E.g. +91 followed by 10 digits.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Symptoms / Problem Description</label>
                  <textarea
                    rows={2}
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="Describe clinical symptoms..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans"
                  />
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Assign Specialist Doctor</label>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 font-sans cursor-pointer"
                  >
                    {DOCTOR_PRESETS.map((dr, idx) => (
                      <option key={idx} value={dr}>{dr}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-sans">
                  <span className="text-xs text-rose-600 font-extrabold block">Triage Emergency?</span>
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-650 focus:ring-rose-220 bg-white border-slate-300 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm hover:translate-y-[-1px] active:translate-y-0 transition-all border border-sky-700 cursor-pointer"
                >
                  Generate Outpatient Pass & Token
                </button>
              </form>
            </div>

            {/* Waiting active list stream */}
            <div className="lg:col-span-12 xl:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Lobby Outpatient Stream</span>
                <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 border border-sky-100 px-2.5 py-0.5 rounded-full">{patients.length} Registered Today</span>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[300px]">
                {patients.length > 0 ? (
                  patients.map((pat) => (
                    <div key={pat._id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{pat.tokenNumberString || `QC${String(pat.token).padStart(3, '0')}`}</span>
                          <span className="text-sm font-bold text-slate-800">{pat.name}</span>
                          {pat.isEmergency && <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">EMERGENCY</span>}
                          <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border tracking-wider transition-all ${
                            pat.status === 'waiting'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : pat.status === 'called'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {pat.status === 'waiting'
                              ? 'Waiting'
                              : pat.status === 'called'
                              ? 'In Consultation'
                              : 'Completed'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-slate-600">MD: {pat.doctorName}</span>
                          {pat.appointmentDate && (
                            <span className="text-sky-750 font-mono text-[9px] bg-sky-50 border border-sky-100 px-1.5 py-0.2 rounded shrink-0">
                              📅 {pat.appointmentDate} @ {pat.appointmentTime}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {pat.status === 'waiting' && (
                          <button
                            onClick={() => onUpdatePatientStatus(pat._id, 'called')}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-600 border border-sky-200 hover:border-sky-650 text-sky-700 hover:text-white font-bold rounded text-[10px] transition-all cursor-pointer"
                          >
                            Call AD
                          </button>
                        )}
                        {pat.status === 'called' && (
                          <button
                            onClick={() => onUpdatePatientStatus(pat._id, 'completed')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 text-emerald-700 hover:text-white font-bold rounded text-[10px] transition-all cursor-pointer"
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingPatient(pat);
                            setEditName(pat.name);
                            setEditDoctor(pat.doctorName || DOCTOR_PRESETS[0]);
                            setEditAge(pat.age ? String(pat.age) : '28');
                            setEditGender(pat.gender || 'Male');
                            setEditPhone(pat.phone || '');
                            setEditEmergency(!!pat.isEmergency);
                            setEditProblemDescription(pat.problemDescription || '');
                          }}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors cursor-pointer"
                          title="Edit Patient"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPatientToDelete(pat)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500">Lobby stream is currently idle</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'add-patient' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600" /> Patient Enrollment Desk
              </h3>
              <p className="text-xs text-slate-500 font-sans">Enlist patient specs and allocate clinical token priorities</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {submitError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-bold">
                  {submitError}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-401 block">Outpatient full legal Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Type name..."
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-sky-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-401 block font-sans">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-sky-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-401 block font-sans">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-sky-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-805 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-[10px] uppercase font-bold text-slate-401 block font-sans">Phone (+91 Indian format)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-mono text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="text"
                    required
                    value={patientPhone.replace(/^\+91/, '')}
                    onChange={(e) => {
                      const inputDigits = e.target.value.replace(/\D/g, '');
                      const cleanDigits = inputDigits.substring(0, 10);
                      setPatientPhone(cleanDigits ? '+91' + cleanDigits : '');
                    }}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-sky-500 rounded-xl py-2.5 pl-11 pr-35 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 font-mono tracking-wider font-semibold"
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-mono mt-1">Format: +91 followed by exactly 10 digits.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-401 block font-sans">Symptom Summary / Problem Description</label>
                <textarea
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Summarize key clinical problem indicators..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-sky-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-401 block">Consultant Specialty / Doctor Assignee</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-sky-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-803 focus:outline-none focus:ring-2 focus:ring-sky-100 font-sans cursor-pointer"
                >
                  {DOCTOR_PRESETS.map((dr, idx) => (
                    <option key={idx} value={dr}>{dr}</option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-650 block uppercase">Require Emergency Triage?</span>
                  <span className="text-[10px] text-slate-550 font-sans">Forces patient ticket to head of clinical waiting paths</span>
                </div>
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-rose-600 focus:ring-rose-220 bg-white border-slate-300 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-sm hover:translate-y-[-1px] active:translate-y-0 transition-colors cursor-pointer border border-sky-700"
              >
                Enroll Patient & Allocate Slot
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'manage-queue' && (
        <div className="space-y-6">
          {/* Quick Consultation setting configurations */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-tight">Adjust Hospital Pacemaker metrics</h4>
              <p className="text-xs text-slate-550">Consultation pacing estimates client waiting schedules</p>
            </div>

            <form onSubmit={handleSaveSettings} className="flex gap-2 shrink-0">
              <input
                type="number"
                min="1"
                max="120"
                value={tempConsultationTime}
                onChange={(e) => setTempConsultationTime(parseInt(e.target.value, 10) || 10)}
                className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-sky-500 rounded-xl text-xs font-mono text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 font-sans"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Save Slot PACE
              </button>
            </form>
          </div>

          {/* Detailed queue editor list */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-650">Outpatient Lobby Directory</h4>
              <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">{waitingPatients.length} Active Queue</span>
            </div>

            <div className="divide-y divide-slate-100">
              {waitingPatients.length > 0 ? (
                waitingPatients.map((p, idx) => (
                  <div key={p._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-all font-sans">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{p.tokenNumberString || `QC${String(p.token).padStart(3, '0')}`}</span>
                        <span className="text-sm font-bold text-slate-800">{p.name}</span>
                        {p.isEmergency && <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-220 px-2 py-0.5 rounded font-mono font-bold animate-pulse">EMERGENCY</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2.5">
                        <span>Specialist: <strong className="text-slate-750 font-bold">{p.doctorName}</strong></span>
                        {p.appointmentDate && (
                          <span className="text-sky-700 font-bold bg-sky-50 border border-sky-100 px-1.5 rounded">Appt: {p.appointmentDate} @ {p.appointmentTime}</span>
                        )}
                        <span>• Enrolled: {new Date(p.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => onUpdatePatientStatus(p._id, 'called')}
                        className="py-1 px-3 bg-sky-50 hover:bg-sky-600 border border-sky-200 hover:border-sky-655 text-sky-700 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" /> Call MD Cabin
                      </button>

                      <button
                        onClick={() => {
                          setReschedulingPatient(p);
                          setNewApptDate(new Date().toISOString().split('T')[0]);
                          setNewApptTime('10:30');
                        }}
                        className="py-1 px-3 bg-teal-50 hover:bg-teal-650 border border-teal-200 hover:border-teal-505 text-teal-700 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        📅 Reschedule
                      </button>

                      <button
                        onClick={() => {
                          setEditingPatient(p);
                          setEditName(p.name);
                          setEditDoctor(p.doctorName || DOCTOR_PRESETS[0]);
                          setEditAge(p.age ? String(p.age) : '28');
                          setEditGender(p.gender || 'Male');
                          setEditPhone(p.phone || '');
                          setEditEmergency(!!p.isEmergency);
                          setEditProblemDescription(p.problemDescription || '');
                        }}
                        className="py-1 px-3 bg-blue-50 hover:bg-sky-650 border border-sky-200 hover:border-sky-505 text-sky-700 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        ✏️ Edit Patient
                      </button>

                      <button
                        onClick={() => setPatientToDelete(p)}
                        className="py-1 px-3 bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 text-rose-650 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Dismiss Pass
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-slate-400 italic text-xs">
                  All clean! Waiting stream lobby is empty.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'completed-patients' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 text-left">
            <h3 className="text-base font-extrabold text-slate-800">Hospital Cleared Consultations Today</h3>
            <p className="text-xs text-slate-505 font-sans font-medium">Appointments successfully handled and record files locked</p>
          </div>

          <div className="divide-y divide-slate-100 text-left">
            {completedPatients.length > 0 ? (
              completedPatients.map((pat) => (
                <div key={pat._id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-all font-sans">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded">{pat.tokenNumberString || `QC${String(pat.token).padStart(3, '0')}`}</span>
                      <span className="text-sm font-bold text-slate-800">{pat.name}</span>
                      <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                        Completed
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Record Locked</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Primary Consultant Consulted: <strong className="text-slate-700">{pat.doctorName}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => onUpdatePatientStatus(pat._id, 'waiting')}
                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-200 text-slate-600 text-[10px] hover:text-slate-800 border border-slate-200 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                    title="Return patient to waiting registry stream"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Re-open Pass
                  </button>
                </div>
              ))
            ) : (
              <div className="p-16 text-center text-slate-400">
                <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No patient consults completed today yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'search-patient' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-800">Queue Search Database Finder</h3>
              
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-705 focus:outline-none cursor-pointer"
              >
                <option value="all">-- All Departments --</option>
                {DOCTOR_PRESETS.map((dr, idx) => (
                  <option key={idx} value={dr}>{dr}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Lookup archives by full name, token number, or checked status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-55 border border-slate-200 hover:border-slate-300 focus:border-sky-500 rounded-xl text-xs text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 text-left">
              Matches Found ({
                patients.filter(pat => {
                  const queryMatches = pat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       pat.token.toString() === searchQuery.trim() || 
                                       (pat.tokenNumberString && pat.tokenNumberString.toLowerCase().includes(searchQuery.toLowerCase().trim()));
                  const doctorMatches = doctorFilter === 'all' ? true : pat.doctorName === doctorFilter;
                  return queryMatches && doctorMatches;
                }).length
              })
            </div>

            <div className="divide-y divide-slate-100 text-left">
              {patients.filter(pat => {
                const queryMatches = pat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                     pat.token.toString() === searchQuery.trim() || 
                                     (pat.tokenNumberString && pat.tokenNumberString.toLowerCase().includes(searchQuery.toLowerCase().trim()));
                const doctorMatches = doctorFilter === 'all' ? true : pat.doctorName === doctorFilter;
                return queryMatches && doctorMatches;
              }).length > 0 ? (
                patients.filter(pat => {
                  const queryMatches = pat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       pat.token.toString() === searchQuery.trim() || 
                                       (pat.tokenNumberString && pat.tokenNumberString.toLowerCase().includes(searchQuery.toLowerCase().trim()));
                  const doctorMatches = doctorFilter === 'all' ? true : pat.doctorName === doctorFilter;
                  return queryMatches && doctorMatches;
                }).map((pat) => (
                  <div key={pat._id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-all font-sans">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-150 font-mono">{pat.tokenNumberString || `QC${String(pat.token).padStart(3, '0')}`}</span>
                        <strong className="text-sm text-slate-800">{pat.name}</strong>
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border tracking-wider transition-all ${
                          pat.status === 'waiting'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : pat.status === 'called'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {pat.status === 'waiting'
                            ? 'Waiting'
                            : pat.status === 'called'
                            ? 'In Consultation'
                            : 'Completed'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Physician Assigned: <strong className="text-slate-700">{pat.doctorName}</strong>
                      </div>
                    </div>
                    <span className="text-xs text-slate-450 font-mono">{new Date(pat.createdAt).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center text-slate-400">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No records found matching query parameters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-xl mx-auto space-y-6 text-left">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-805 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-600" /> Receptionist profile credentials
            </h3>

            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Staff Account Role Name</span>
                <span className="text-sm font-bold text-slate-800 block">{currentUser.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Email</span>
                <span className="text-sm font-mono text-slate-650 block">{currentUser.email}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Privilege Tier Access</span>
                <span className="text-[10px] font-bold text-[#0284C7] bg-sky-50 border border-sky-100 px-3 py-1 rounded inline-block mt-2">RECEPTIONIST CLERK AUTHORITY</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule appointment Modal Dialog */}
      {reschedulingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-802">
            <div className="border-b border-slate-100 pb-3 text-left">
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" /> Reschedule Outpatient Slot
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Updating appointment slot for <strong className="text-slate-800 font-bold">{reschedulingPatient.name}</strong>
              </p>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold text-left">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Select New Date</label>
                <input
                  type="date"
                  required
                  value={newApptDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewApptDate(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-205 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Select New Time</label>
                <input
                  type="time"
                  required
                  value={newApptTime}
                  onChange={(e) => setNewApptTime(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-205 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setReschedulingPatient(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-150 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-650 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  Confirm Slot Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit patient record Modal Dialog */}
      {editingPatient && (
        <div id="patient_edit_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-802 text-left">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="p-1.5 bg-[#0284C7]/10 text-[#0284C7] rounded-lg">
                <Edit className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Edit Patient Case File</h4>
                <p className="text-[10px] text-slate-500 font-medium font-sans">Modify client records for ticket #{editingPatient.token}</p>
              </div>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-401 block">Patient Legal Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-401 block">Patient Age</label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    required
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-401 block">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-401 block">Phone (+91 Indian format preferred)</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-401 block">Symptoms / Problem Description</label>
                <textarea
                  rows={2}
                  required
                  value={editProblemDescription}
                  onChange={(e) => setEditProblemDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  placeholder="Describe patient's symptoms..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-401 block">Clinical Specialist Assigned</label>
                <select
                  value={editDoctor}
                  onChange={(e) => setEditDoctor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  {DOCTOR_PRESETS.map((dr, idx) => (
                    <option key={idx} value={dr}>{dr}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-650 block uppercase">Requires Emergency Triage?</span>
                  <p className="text-[10px] text-slate-450 font-sans">Bumps ticket directly to active consults queue</p>
                </div>
                <input
                  type="checkbox"
                  checked={editEmergency}
                  onChange={(e) => setEditEmergency(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-rose-600 focus:ring-rose-220 bg-white border-slate-300 cursor-pointer"
                />
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-150 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer text-center"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
