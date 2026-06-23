import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  User, 
  Stethoscope, 
  Calendar, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Phone,
  AlertCircle
} from 'lucide-react';
import { Patient, QueueSettings, ConsultationReport } from '../types';

export const PatientPortal: React.FC = () => {
  // Navigation sub-tabs inside patient portal
  const [activePortalTab, setActivePortalTab] = useState<'track' | 'report'>('track');
  
  // Tracking token states
  const [trackToken, setTrackToken] = useState('');
  const [trackedPatient, setTrackedPatient] = useState<Patient | null>(null);
  const [globalSettings, setGlobalSettings] = useState<QueueSettings | null>(null);
  const [totalWaitingCount, setTotalWaitingCount] = useState(0);
  const [tokensAhead, setTokensAhead] = useState(0);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  // Report search states
  const [reportToken, setReportToken] = useState('');
  const [consultationReport, setConsultationReport] = useState<ConsultationReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Track patient function
  const handleTrackToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = trackToken.trim();
    if (!cleaned) {
      setTrackError('Please enter a valid Token Number.');
      return;
    }
    setTrackError(null);
    setTrackLoading(true);
    setTrackedPatient(null);

    try {
      // Fetch patients and settings to calculate wait time accurately
      const [patientsRes, settingsRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/settings')
      ]);

      if (!patientsRes.ok || !settingsRes.ok) {
        throw new Error('Failed to retrieve server medical status.');
      }

      const patients: Patient[] = await patientsRes.json();
      const settings: QueueSettings = await settingsRes.json();
      setGlobalSettings(settings);

      // Search matching patient
      const match = patients.find(p => 
        p.tokenNumberString?.toUpperCase() === cleaned.toUpperCase() ||
        `QC${String(p.token).padStart(3, '0')}` === cleaned.toUpperCase()
      );

      if (!match) {
        setTrackError(`Token "${cleaned}" is not active or registered today. Please confirm with clinic receptionist.`);
        return;
      }

      setTrackedPatient(match);

      // Calculate how many waiting patients are ahead in line
      if (match.status === 'waiting') {
        const waitingAhead = patients.filter(p => 
          p.status === 'waiting' && 
          p.token < match.token &&
          (!p.doctorId || p.doctorId === match.doctorId)
        ).length;
        setTokensAhead(waitingAhead);
      } else {
        setTokensAhead(0);
      }

      // Track total waiting
      setTotalWaitingCount(patients.filter(p => p.status === 'waiting').length);

    } catch (err: any) {
      setTrackError(err.message || 'Error communicating with tracker system.');
    } finally {
      setTrackLoading(false);
    }
  };

  // Find report function
  const handleRetrieveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = reportToken.trim();
    if (!cleaned) {
      setReportError('Please write down your Token Number.');
      return;
    }
    setReportError(null);
    setReportLoading(true);
    setConsultationReport(null);

    try {
      const res = await fetch(`/api/consultation-reports/${encodeURIComponent(cleaned)}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`No consultation report is generated yet for Token "${cleaned}". If consultation is currently in progress, please check back in a few minutes.`);
        }
        throw new Error('Server returned an issue while fetching report.');
      }
      const data: ConsultationReport = await res.json();
      setConsultationReport(data);
    } catch (err: any) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: Patient['status']) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Waiting in Queue
          </span>
        );
      case 'called':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 border border-sky-200 text-sky-750 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping" />
            In Consultation
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Selector Sub-Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/50">
        <button
          onClick={() => {
            setActivePortalTab('track');
            setTrackError(null);
          }}
          className={`flex-1 py-3 text-xs font-bold text-center uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activePortalTab === 'track'
              ? 'bg-white text-sky-655 shadow-sm border border-slate-200/20'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🔍 Track Your Token
        </button>
        <button
          onClick={() => {
            setActivePortalTab('report');
            setReportError(null);
          }}
          className={`flex-1 py-3 text-xs font-bold text-center uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activePortalTab === 'report'
              ? 'bg-white text-sky-655 shadow-sm border border-slate-200/20'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📄 Consultation Reports
        </button>
      </div>

      {activePortalTab === 'track' ? (
        <div className="space-y-6 text-left">
          {/* TRACK FORM */}
          <form onSubmit={handleTrackToken} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-slate-400">
                Patient Token Number
              </label>
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={trackToken}
                    onChange={(e) => setTrackToken(e.target.value)}
                    placeholder="Enter Token e.g., QC002 "
                    className="w-full bg-slate-50 shadow-inner border border-slate-220 text-slate-800 font-medium placeholder-slate-400 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold rounded-xl text-sm shadow-md cursor-pointer transition-all flex items-center gap-2"
                >
                  {trackLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Track Status"
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-450 font-medium">
                Tip: Enter details like <strong className="text-sky-700 font-bold">QC001</strong>, <strong className="text-sky-700 font-bold">QC002</strong>, or <strong className="text-sky-700 font-bold">QC003</strong> to try it instantly.
              </p>
            </div>
          </form>

          {/* ERROR FEEDBACK */}
          {trackError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{trackError}</span>
            </div>
          )}

          {/* TRACKED PATIENT VIEW */}
          {trackedPatient && (
            <div className="bg-slate-50/70 border border-slate-200/70 p-5 rounded-2xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-start justify-between border-b border-slate-200/50 pb-3">
                <div>
                  <h4 className="text-sm font-sans font-extrabold text-slate-850">
                    {trackedPatient.name}
                  </h4>
                  <p className="text-xs text-slate-550 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Age: {trackedPatient.age || 'N/A'} • {trackedPatient.gender || 'N/A'}</span>
                  </p>
                </div>
                <div>
                  {getStatusBadge(trackedPatient.status)}
                </div>
              </div>

              {/* Patient Core Tracking Stats */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl text-left shadow-2xs space-y-1">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-450 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-sky-500" /> Assigned Doctor
                  </span>
                  <div className="text-xs font-extrabold text-slate-805">
                    {trackedPatient.doctorName}
                  </div>
                </div>

                <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl text-left shadow-2xs space-y-1">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-450 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> Live Called Token
                  </span>
                  <div className="text-sm font-sans font-black text-sky-700">
                    {globalSettings ? `QC${String(globalSettings.currentToken).padStart(3, '0')}` : 'QC001'}
                  </div>
                </div>
              </div>

              {trackedPatient.status === 'waiting' && (
                <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-xl flex items-start gap-3.5">
                  <div className="p-2.5 bg-white border border-sky-120/40 rounded-xl text-sky-655 shadow-xs shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-sans font-extrabold text-slate-850">
                      Estimated Waiting Information
                    </h5>
                    <p className="text-xs text-slate-550 leading-relaxed">
                      There {tokensAhead === 1 ? 'is' : 'are'}{' '}
                      <strong className="text-slate-850 font-bold">{tokensAhead} {tokensAhead === 1 ? 'patient' : 'patients'}</strong> ahead of you.
                    </p>
                    <div className="text-sm font-sans font-black text-sky-750 mt-1">
                      ~ {tokensAhead * (globalSettings?.consultationTime || 10)} minutes wait time
                    </div>
                  </div>
                </div>
              )}

              {trackedPatient.status === 'called' && (
                <div className="bg-sky-500/5 border border-sky-550/10 p-4 rounded-xl flex items-center gap-3.5 text-sky-700">
                  <Stethoscope className="w-6 h-6 animate-pulse" />
                  <div>
                    <h5 className="text-xs font-bold">In Active Consultation</h5>
                    <p className="text-xs text-slate-550 leading-relaxed">
                      Please enter Consultation Room now. The doctor is actively reviewing your chart.
                    </p>
                  </div>
                </div>
              )}

              {trackedPatient.status === 'completed' && (
                <div className="bg-emerald-50 border border-emerald-120 p-4 rounded-xl flex items-center gap-3.5 text-emerald-700">
                  <CheckCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold">Consultation Finished</h5>
                    <p className="text-xs text-slate-550 leading-relaxed">
                      Your medical check-up is complete. You can download and inspect your professional Consultation Report in the next tab.
                    </p>
                  </div>
                </div>
              )}

              {/* Extra Details */}
              <div className="border-t border-slate-200/50 pt-3 text-left space-y-1 text-[11px] text-slate-450 font-semibold leading-relaxed">
                <div>• Problem Description: {trackedPatient.problemDescription || 'General diagnostic request'}</div>
                {trackedPatient.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Contact: {trackedPatient.phone}</span>
                  </div>
                )}
                <div>• Registered Date: {trackedPatient.registrationDate || trackedPatient.appointmentDate}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 text-left">
          {/* RETRIEVE REPORT FORM */}
          <form onSubmit={handleRetrieveReport} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-slate-400">
                Patient Token Number
              </label>
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <FileText className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={reportToken}
                    onChange={(e) => setReportToken(e.target.value)}
                    placeholder="Enter Token e.g., QC001"
                    className="w-full bg-slate-50 shadow-inner border border-slate-220 text-slate-800 font-medium placeholder-slate-400 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={reportLoading}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold rounded-xl text-sm shadow-md cursor-pointer transition-all flex items-center gap-2"
                >
                  {reportLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Search Report"
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-450 font-medium">
                Try searching <strong className="text-sky-700 font-bold">QC001</strong> or <strong className="text-sky-700 font-bold">QC002</strong> to check out a generated clinical PDF demo.
              </p>
            </div>
          </form>

          {/* REPORT ERROR FEEDBACK */}
          {reportError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{reportError}</span>
            </div>
          )}

          {/* CONSULTATION REPORT FOUND VIEW */}
          {consultationReport && (
            <div className="space-y-4">
              {/* Paper Preview */}
              <div 
                id="printable-consultation-report" 
                className="bg-white border border-slate-300 p-6 sm:p-8 rounded-2xl relative shadow-md text-slate-800 space-y-6"
              >
                {/* Print Only Letterhead Container (Active strictly during ctrl+p or click print) */}
                <div className="border-b-4 border-sky-800 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sky-800">
                      <div className="p-1 px-2 bg-sky-800 text-white font-sans text-xs font-extrabold tracking-wider rounded-md">
                        QC
                      </div>
                      <span className="text-lg font-sans font-black uppercase tracking-tight">
                        Queue Cure General Hospital
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed max-w-md font-semibold">
                      100 Clinical Plaza, Medical District, Metro City • Helpline: +91 9999 8888 | www.queuecurehospital.org
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Consultation Token ID
                    </div>
                    <div className="text-base font-sans font-black text-sky-800 leading-tight">
                      {consultationReport.tokenNumber}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">
                      Date: {consultationReport.consultationDate}
                    </div>
                  </div>
                </div>

                {/* Patient Grid Details */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-450 tracking-wide mb-0.5">Patient Name</span>
                    <span className="text-[13px] font-extrabold text-slate-800">{consultationReport.patientName}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-450 tracking-wide mb-0.5">Assigned Doctor</span>
                    <span className="text-[13px] font-extrabold text-slate-800">{consultationReport.doctorName}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="block text-[9px] uppercase font-bold text-slate-450 tracking-wide mb-0.5">Diagnostic Date</span>
                    <span className="text-[13px] font-extrabold text-slate-800">{consultationReport.consultationDate}</span>
                  </div>
                </div>

                {/* Clinical Diagnosis Section */}
                <div className="text-left space-y-2">
                  <h5 className="text-[11px] font-sans font-black uppercase text-sky-800 tracking-wider border-b border-slate-200 pb-1.5">
                    I. DIAGNOSIS & CLINICAL ASSESSMENT
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold pl-1 whitespace-pre-wrap">
                    {consultationReport.diagnosis}
                  </p>
                </div>

                {/* RX Prescription List */}
                <div className="text-left space-y-2.5">
                  <h5 className="text-[11px] font-sans font-black uppercase text-sky-800 tracking-wider border-b border-slate-200 pb-1.5">
                    II. RX - MEDICAL PRESCRIPTION
                  </h5>
                  <div className="bg-sky-50/30 border border-slate-100 p-4 rounded-xl whitespace-pre-wrap text-xs text-slate-700 font-semibold leading-relaxed font-mono">
                    {consultationReport.prescription}
                  </div>
                </div>

                {/* Doctor Clinical Notes */}
                <div className="text-left space-y-2">
                  <h5 className="text-[11px] font-sans font-black uppercase text-sky-800 tracking-wider border-b border-slate-200 pb-1.5">
                    III. CLINICAL GUIDELINES & NOTES
                  </h5>
                  <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-wrap pl-1">
                    {consultationReport.notes}
                  </p>
                </div>

                {/* Signature Block */}
                <div className="flex justify-between items-end pt-6 border-t border-slate-200/80">
                  <div className="text-[10px] text-slate-450 leading-relaxed font-bold max-w-sm">
                    ⚠️ Note: This is an official digital health summary generated by Queue Cure EMR Core. Please carry a copy during subsequent diagnostic follow-ups.
                  </div>
                  <div className="text-center w-48 space-y-1">
                    <div className="text-xs font-mono italic text-slate-500 font-medium">
                      Signed Digitally
                    </div>
                    <div className="border-t border-slate-350 pt-1.5">
                      <div className="text-[11px] font-extrabold text-slate-800">
                        {consultationReport.doctorName}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                        Clinic Practitioner
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-3 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-slate-550" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
