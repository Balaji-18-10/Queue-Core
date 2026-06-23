import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  User, 
  CheckCircle, 
  Users, 
  Activity, 
  ChevronRight, 
  ArrowUpRight, 
  Check, 
  Play,
  Clock,
  Briefcase,
  FileText,
  Search,
  Settings,
  Sparkles,
  Award,
  Calendar as CalendarIcon,
  AlertTriangle,
  Plus,
  Trash2,
  Pill,
  Printer,
  Download,
  Bell,
  CheckCheck,
  Building,
  FileCheck,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell, 
  AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

import { Patient, MedicalRecord } from '../types';

interface DoctorDashboardProps {
  token: string;
  currentUser: { 
    _id: string; 
    name: string; 
    email: string; 
    role: string; 
    specialization?: string;
    experience?: string;
    availability?: string;
  };
  patients: Patient[];
  onCallNext: () => void;
  onUpdatePatientStatus: (id: string, status: 'waiting' | 'called' | 'completed') => void;
  onLogout: () => void;
  activeTab?: string;
}

interface PrescribedMedicine {
  name: string;
  dosage: string; // e.g. "1-0-1"
  duration: string; // e.g. "5 Days"
  instructions: string; // e.g. "After meals"
}

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  time: string;
  type: 'emergency' | 'assignment' | 'system' | 'reschedule';
  unread: boolean;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ 
  currentUser, 
  patients, 
  onCallNext, 
  onUpdatePatientStatus, 
  onLogout,
  activeTab = 'dashboard'
}) => {
  // Global toasts / status banners
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  // Doctor status toggle (Available, Busy, Offline)
  const [docAvailabilityStatus, setDocAvailabilityStatus] = useState<'Available' | 'Busy' | 'Offline'>('Available');

  // Load custom doctor credentials
  const [docSpecialization, setDocSpecialization] = useState(currentUser.specialization || "General Medicine Practitioner");
  const [docExperience, setDocExperience] = useState(currentUser.experience || "10+ Years");
  const [docAvailability, setDocAvailability] = useState(currentUser.availability || "Mon-Fri 09:00 AM - 05:00 PM");

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'nt1',
      title: 'Emergency Case Joined Queue',
      content: 'Sarah Connor has been checked in as an emergency patient for Cardiology.',
      time: '10 Mins ago',
      type: 'emergency',
      unread: true
    },
    {
      id: 'nt2',
      title: 'New Patient Registration',
      content: 'Bruce Banner has been assigned to your pediatric waitlist.',
      time: '25 Mins ago',
      type: 'assignment',
      unread: true
    },
    {
      id: 'nt3',
      title: 'Schedule Reschedule Notice',
      content: 'Arthur Dent moved appointment time to 11:30 AM.',
      time: '1 Hour ago',
      type: 'reschedule',
      unread: false
    }
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Selected Patient for Medical Records / Desk Consultation
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Medical records timeline state
  const [historicalRecords, setHistoricalRecords] = useState<MedicalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Active Desk Consultation Input State
  const [diagnosisSymptoms, setDiagnosisSymptoms] = useState('');
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Prescription medicines state
  const [medicinesList, setMedicinesList] = useState<PrescribedMedicine[]>([
    { name: 'Montek-LC', dosage: '0-0-1', duration: '5 Days', instructions: 'After dinner' }
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('1-0-1');
  const [newMedDuration, setNewMedDuration] = useState('7 Days');
  const [newMedInstructions, setNewMedInstructions] = useState('After meals');

  // Patient History search parameters
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'waiting' | 'called' | 'completed' | 'emergency'>('all');

  // Calendar parameters
  const [calendarView, setCalendarView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Report Modal view state
  const [reportingPeriod, setReportingPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | null>(null);

  // Determine specialties/assignment compatibility
  const isMyPatient = (p: Patient) => {
    if (p.doctorId && p.doctorId === currentUser._id) {
      return true;
    }
    const docNameClean = currentUser.name.toLowerCase().replace('dr.', '').trim();
    const patientDocLower = p.doctorName.toLowerCase();
    const specLower = docSpecialization.toLowerCase();
    
    return patientDocLower.includes(docNameClean) || 
           (specLower && patientDocLower.includes(specLower));
  };

  // Specialty subsets
  const myPatients = patients.filter(isMyPatient);
  const myWaiting = myPatients.filter(p => p.status === 'waiting');
  const myActive = myPatients.find(p => p.status === 'called');
  const myCompleted = myPatients.filter(p => p.status === 'completed');

  // Other general clinic stats
  const otherPatients = patients.filter(p => !isMyPatient(p));
  const otherWaitingCount = otherPatients.filter(p => p.status === 'waiting').length;

  // Real-time notifications for new patients matching specialist and emergency
  useEffect(() => {
    // Listen for new patients who are emergency or assigned
    const newEmergency = myWaiting.filter(p => p.isEmergency);
    if (newEmergency.length > 0) {
      // Ensure we have an alert or notification log for them
      const exists = notifications.some(n => n.content.includes(newEmergency[0].name));
      if (!exists) {
        const freshAlert: NotificationItem = {
          id: `emergency_${Date.now()}`,
          title: 'Immediate Action Required',
          content: `${newEmergency[0].name} registered as EMERGENCY priority case!`,
          time: 'Just now',
          type: 'emergency',
          unread: true
        };
        setNotifications(prev => [freshAlert, ...prev]);
        setSuccessInfo(`URGENT: Emergency patient ${newEmergency[0].name} joined the queue!`);
        setTimeout(() => setSuccessInfo(null), 6000);
      }
    }
  }, [patients]);

  // Load history of active consultation desk patient
  useEffect(() => {
    const activePatient = myActive;
    if (activePatient) {
      fetchHistoricalRecords(activePatient.patientId || activePatient._id, activePatient.name);
    } else {
      setHistoricalRecords([]);
    }
  }, [myActive]);

  // Fetch Patient Medical Records Timeline
  const fetchHistoricalRecords = async (patientId: string, patientName: string) => {
    setRecordsLoading(true);
    try {
      const url = `/api/medical-records?patientId=${encodeURIComponent(patientId)}&patientName=${encodeURIComponent(patientName)}`;
      const res = await fetch(url);
      if (res.ok) {
        const records = await res.json();
        setHistoricalRecords(records);
      }
    } catch (err) {
      console.error("Error loading historical logs:", err);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Add Row to Pharmaceutical Medicine prescription
  const handleAddMedicine = () => {
    if (!newMedName.trim()) {
      setErrorInfo('Medicine name is required.');
      setTimeout(() => setErrorInfo(null), 3000);
      return;
    }
    setMedicinesList(prev => [...prev, {
      name: newMedName.trim(),
      dosage: newMedDosage,
      duration: newMedDuration,
      instructions: newMedInstructions
    }]);
    setNewMedName('');
    setNewMedDosage('1-0-1');
    setNewMedDuration('7 Days');
    setNewMedInstructions('After meals');
  };

  const handleRemoveMedicine = (idx: number) => {
    setMedicinesList(prev => prev.filter((_, i) => i !== idx));
  };

  // Consultation Submission + REST Save
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    const activePatient = myActive;
    if (!activePatient) {
      setErrorInfo('No active patient is admitted.');
      setTimeout(() => setErrorInfo(null), 3000);
      return;
    }

    if (!diagnosisSummary.trim()) {
      setErrorInfo('Primary Diagnosis/Condition field is required.');
      setTimeout(() => setErrorInfo(null), 3000);
      return;
    }

    const payload = {
      patientId: activePatient.patientId || activePatient._id,
      patientName: activePatient.name,
      doctorId: currentUser._id,
      doctorName: currentUser.name,
      date: new Date().toLocaleDateString('en-GB'),
      symptoms: diagnosisSymptoms.trim() || 'General health discomfort',
      diagnosis: diagnosisSummary.trim(),
      notes: consultationNotes.trim() || 'No explicit additional observation records filed.',
      followUpDate: followUpDate || undefined,
      medicines: medicinesList
    };

    try {
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onUpdatePatientStatus(activePatient._id, 'completed');
        setSuccessInfo(`Consultation for ${activePatient.name} completed and clinical files cataloged.`);
        // Reset states
        setDiagnosisSymptoms('');
        setDiagnosisSummary('');
        setConsultationNotes('');
        setFollowUpDate('');
        setMedicinesList([{ name: 'Montek-LC', dosage: '0-0-1', duration: '5 Days', instructions: 'After dinner' }]);
        
        setTimeout(() => setSuccessInfo(null), 4000);
      } else {
        const errorText = await res.text();
        setErrorInfo(`Database write failed: ${errorText}`);
        setTimeout(() => setErrorInfo(null), 4000);
      }
    } catch (err) {
      setErrorInfo('Network transmission failed. Please evaluate server stability.');
      setTimeout(() => setErrorInfo(null), 4000);
    }
  };

  // Trigger Letterhead Print for prescriptions
  const handlePrintPrescription = () => {
    const activePatient = myActive;
    if (!activePatient) {
      setErrorInfo("Admit a patient to generate prescription layout.");
      setTimeout(() => setErrorInfo(null), 3000);
      return;
    }

    const printContents = `
      <html>
        <head>
          <title>Prescription Letterhead - Queue Cure Hospital</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; padding: 40px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-b: 3px double #0284c7; padding-bottom: 12px; margin-bottom: 25px; }
            .logo-area { display: flex; align-items: center; gap: 10px; }
            .logo-icon { font-size: 28px; font-weight: bold; color: #0284c7; }
            .hospital-info { text-align: right; font-size: 11px; color: #64748b; }
            .doctor-details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; }
            .patient-vitals { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 30px; display: grid; grid-template-columns: repeat(4, 1fr); font-size: 12px; }
            .vitals-item { margin-bottom: 5px; }
            .rx-title { font-size: 24px; font-weight: bold; color: #0284c7; margin-bottom: 15px; font-family: Georgia, serif; }
            .med-table { w-full: 100%; width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .med-table th { background: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
            .med-table td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; font-size: 13px; }
            .observations { border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #475569; margin-bottom: 50px; }
            .footer-signature { text-align: right; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              input, button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <span class="logo-icon">&#x271a; QUEUE CURE</span>
              <div style="margin-left: 10px;">
                <div style="font-size: 16px; font-weight: bold; color: #0f172a;">Queue Cure multispecialty Hospital</div>
                <div style="font-size: 10px; color: #64748b;">Accredited Clinical Excellence Registry</div>
              </div>
            </div>
            <div class="hospital-info">
              <strong>Medical Drive Center</strong><br />
              Sector 4, Healthcare Square, NH-44<br />
              Tel: +91 999 888 7776 | info@queuecure.com
            </div>
          </div>

          <div class="doctor-details">
            <div>
              <div style="font-size: 15px; font-weight: bold; color: #0284c7;">${currentUser.name}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: bold;">${docSpecialization}</div>
              <div style="font-size: 10px; color: #64748b;">REGD NO: QCH-${currentUser._id.substr(4, 5).toUpperCase()}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: #475569;">Experience: ${docExperience}</div>
              <div style="font-size: 11px; color: #475569;">Schedule: ${docAvailability}</div>
            </div>
          </div>

          <div class="patient-vitals">
            <div class="vitals-item"><strong>Patient Name:</strong><br />${activePatient.name}</div>
            <div class="vitals-item"><strong>Age/Sex:</strong><br />${activePatient.age || '34'} Yrs / ${activePatient.gender || 'Female'}</div>
            <div class="vitals-item"><strong>Ticket Token:</strong><br />TOKEN #${activePatient.token}</div>
            <div class="vitals-item"><strong>Date:</strong><br />${new Date().toLocaleDateString('en-GB')}</div>
          </div>

          <div class="rx-title">Rx</div>
          <table class="med-table">
            <thead>
              <tr>
                <th>Medicine / Formulation Name</th>
                <th>Dosage Regime</th>
                <th>Course Duration</th>
                <th>Clinical Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${medicinesList.length > 0 ? medicinesList.map(med => `
                <tr>
                  <td><strong>${med.name}</strong></td>
                  <td><span style="font-family: monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${med.dosage}</span></td>
                  <td>${med.duration}</td>
                  <td><small style="color: #64748b;">${med.instructions}</small></td>
                </tr>
              `).join('') : '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No prescriptions added</td></tr>'}
            </tbody>
          </table>

          <div class="observations">
            <p><strong>Primary Symptoms Reported:</strong> ${diagnosisSymptoms || 'General fatigue and medical monitoring request'}</p>
            <p><strong>Diagnosed Pathology/Parameters:</strong> <u>${diagnosisSummary || 'Investigation pending clinical vitals review'}</u></p>
            <p><strong>Clinical Advice & Lifestyle Observances:</strong> ${consultationNotes || 'Rest and stay hydrated.'}</p>
            ${followUpDate ? `<p><strong>Recommended Clinical Re-evaluation:</strong> ${new Date(followUpDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          </div>

          <div class="footer-signature">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=QCH-Rx-${activePatient.token}" style="float: left;" />
            <div style="display: inline-block;">
              <div style="font-size: 13px; font-weight: bold;">${currentUser.name}</div>
              <div style="font-size: 10px; color: #64748b;">Physician Signature & Medical Stamp</div>
              <div style="border-top:1px solid #94a3b8; width: 150px; margin-top:25px;"></div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContents);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      setErrorInfo("Popup blocked. Enable popups in your browser layout.");
      setTimeout(() => setErrorInfo(null), 3500);
    }
  };

  // Print Daily/Weekly/Monthly Administrative Report
  const handlePrintReport = (period: 'Daily' | 'Weekly' | 'Monthly') => {
    const totalSeen = myCompleted.length;
    const totalPending = myWaiting.length;
    const emergencies = myWaiting.filter(p => p.isEmergency).length;

    const printContents = `
      <html>
        <head>
          <title>${period} Compliance Summary Report - Queue Cure</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 45px; }
            .report-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .grid-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .stat-val { font-size: 28px; font-weight: bolder; color: #0284c7; margin-top: 5px; }
            .table-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #0284c7; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; font-weight: bold; color: #334155; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1 style="margin: 0; color: #0284c7;">QUEUE CURE SAAS MANAGEMENT</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold; color: #475569;">${period} Clinical Performance Registry Audit</p>
            <p style="margin: 3px 0 0 0; font-size: 10px; color: #94a3b8;">Printed on ${new Date().toLocaleString()}</p>
          </div>

          <p style="font-size: 12px; margin-bottom: 25px;">
            The subsequent analytics represent administrative status logs gathered for <strong>${currentUser.name}</strong> (${docSpecialization}) during the designated surveillance frame. All indicators are certified of clinic-grade telemetry standards.
          </p>

          <div class="grid-stats">
            <div class="stat-box">
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Patients Resolved</strong>
              <div class="stat-val">${totalSeen}</div>
            </div>
            <div class="stat-box">
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Lounge Backlog</strong>
              <div class="stat-val">${totalPending}</div>
            </div>
            <div class="stat-box">
              <strong style="color: #64748b; font-size: 11px; text-transform: uppercase;">Priority Emergencies</strong>
              <div class="stat-val" style="color: #ef4444;">${emergencies}</div>
            </div>
          </div>

          <div class="table-title">Outpatients Processed Logs</div>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Outpatient Name</th>
                <th>Age/Gender</th>
                <th>Assigned Physician</th>
                <th>Appointment Time</th>
                <th>Current Ingress Status</th>
              </tr>
            </thead>
            <tbody>
              ${myPatients.map(p => `
                <tr>
                  <td><strong>#${p.token}</strong></td>
                  <td>${p.name}</td>
                  <td>${p.age || '34'} Y / ${p.gender || 'Female'}</td>
                  <td>${p.doctorName}</td>
                  <td>${p.appointmentTime || '10:30 AM'}</td>
                  <td><span style="color: ${p.status === 'completed' ? '#10b981' : p.status === 'called' ? '#3b82f6' : '#eab308'}; font-weight: bold; text-transform: capitalize;">${p.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>
              <strong>Audit Office Signature & Seal</strong><br />
              <div style="border-top:1px solid #cbd5e1; width:200px; margin-top:40px;"></div>
            </div>
            <div style="text-align: right;">
              <strong>Authorized Physician Sign-off</strong><br />
              ${currentUser.name} (${docSpecialization})<br />
              <div style="border-top:1px solid #cbd5e1; width:200px; margin-top:30px;"></div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContents);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      setErrorInfo("Popup blocked. Enable popups in your browser layout.");
      setTimeout(() => setErrorInfo(null), 3500);
    }
  };

  // Recharts Static / Dynamic Datasets for Charts
  // Patients Seen Today Hour-wise from 9 AM to 6 PM
  const patientsSeenData = [
    { hour: '09 AM', count: 3 },
    { hour: '10 AM', count: 4 },
    { hour: '11 AM', count: myCompleted.length > 0 ? 5 + myCompleted.length : 6 },
    { hour: '12 PM', count: 7 },
    { hour: '01 PM', count: 2 },
    { hour: '02 PM', count: 4 },
    { hour: '03 PM', count: myWaiting.length > 2 ? 6 : 5 },
    { hour: '04 PM', count: 4 },
    { hour: '05 PM', count: 3 },
    { hour: '06 PM', count: 1 }
  ];

  // Appointment Status distribution (Pie chart)
  const appointmentStatusData = [
    { name: 'Waiting', value: myWaiting.length || 3, color: '#EAB308' },
    { name: 'In Consultation', value: myActive ? 1 : 0, color: '#0284C7' },
    { name: 'Completed', value: myCompleted.length || 2, color: '#0F766E' },
    { name: 'Emergency', value: myWaiting.filter(p => p.isEmergency).length || 1, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // Weekly Trend statistics from Monday to Sunday
  const weeklyPatientData = [
    { name: 'Mon', count: 18 },
    { name: 'Tue', count: 22 },
    { name: 'Wed', count: 25 },
    { name: 'Thu', count: 20 },
    { name: 'Fri', count: 28 },
    { name: 'Sat', count: myCompleted.length + 8 },
    { name: 'Sun', count: 5 }
  ];

  // Area chart for average consultation times (Daily performance)
  const avgConsultationTimeData = [
    { day: 'Mon', minutes: 12 },
    { day: 'Tue', minutes: 14 },
    { day: 'Wed', minutes: 10 },
    { day: 'Thu', minutes: 15 },
    { day: 'Fri', minutes: 13 },
    { day: 'Sat', minutes: 11 },
    { day: 'Sun', minutes: 9 }
  ];

  // Filter patient logs for searching
  const filteredHistoryPatients = patients.filter(pat => {
    const qLower = historySearchQuery.toLowerCase().trim();
    const tokenMatch = pat.token.toString() === qLower;
    const nameMatch = pat.name.toLowerCase().includes(qLower);
    const phoneMatch = pat.phone ? pat.phone.toLowerCase().includes(qLower) : false;
    const queryPass = !qLower || tokenMatch || nameMatch || phoneMatch;

    let filterPass = true;
    if (historyStatusFilter === 'waiting') filterPass = pat.status === 'waiting' && !pat.isEmergency;
    else if (historyStatusFilter === 'completed') filterPass = pat.status === 'completed';
    else if (historyStatusFilter === 'called') filterPass = pat.status === 'called';
    else if (historyStatusFilter === 'emergency') filterPass = pat.isEmergency && pat.status === 'waiting';

    return queryPass && filterPass;
  });

  // Calendar event rendering mock list
  const getCalendarSlots = () => {
    // Return mock slots for this doctor
    return [
      { time: '09:00 AM', status: 'Booked', patient: 'Eleanor Shellstrop', checkedIn: true },
      { time: '09:30 AM', status: 'Available', patient: null, checkedIn: false },
      { time: '10:00 AM', status: 'Booked', patient: 'Chidi Anagonye', checkedIn: true },
      { time: '10:30 AM', status: 'Available', patient: null, checkedIn: false },
      { time: '11:00 AM', status: 'Booked', patient: 'Arthur Dent', checkedIn: true },
      { time: '11:30 AM', status: 'Busy', patient: 'Slot Locked', checkedIn: false },
      { time: '12:00 PM', status: 'Booked', patient: 'Sarah Connor', checkedIn: true },
      { time: '02:00 PM', status: 'Booked', patient: 'Bruce Banner', checkedIn: true },
      { time: '03:00 PM', status: 'Available', patient: null, checkedIn: false },
      { time: '04:00 PM', status: 'Booked', patient: 'Diana Prince', checkedIn: true }
    ];
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const updateDoctorProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessInfo("Practitioner profile details saved into administrative clinic indexes.");
    setTimeout(() => setSuccessInfo(null), 3000);
  };

  const getStatusDotColor = () => {
    if (docAvailabilityStatus === 'Available') return 'bg-emerald-500 animate-ping';
    if (docAvailabilityStatus === 'Busy') return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Dynamic Action Notifications Banner */}
      {successInfo && (
        <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCheck className="w-4 h-4 text-emerald-600 animate-bounce" />
            <span>{successInfo}</span>
          </div>
          <button onClick={() => setSuccessInfo(null)} className="text-emerald-500 hover:text-emerald-700 text-sm font-bold font-mono">×</button>
        </div>
      )}

      {errorInfo && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>{errorInfo}</span>
          </div>
          <button onClick={() => setErrorInfo(null)} className="text-rose-500 hover:text-rose-700 text-sm font-bold font-mono">×</button>
        </div>
      )}

      {/* TOP COMMAND CONSOLE & NOTIFICATION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
        <div className="text-left">
          <h1 className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-900">
            <Building className="w-5 h-5 text-sky-600" /> Professional Hospital Console
          </h1>
          <p className="text-[11px] text-slate-450 font-mono uppercase tracking-wide">
            Clinic: NH-Care • Section: Outpatient (OPD) Desk
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
          {/* Availability Status Menu */}
          <div className="bg-white border border-slate-200/80 p-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 px-2">Status:</span>
            {(['Available', 'Busy', 'Offline'] as const).map(st => (
              <button
                key={st}
                onClick={() => {
                  setDocAvailabilityStatus(st);
                  setSuccessInfo(`Practitioner is now registered as [${st}] in registry board.`);
                  setTimeout(() => setSuccessInfo(null), 3000);
                }}
                className={`py-1 px-3 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  docAvailabilityStatus === st 
                    ? st === 'Available' ? 'bg-emerald-500 text-white shadow-sm' : st === 'Busy' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-500 text-white shadow-sm'
                    : 'hover:bg-slate-50 text-slate-500'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Real-time Alerts Bell */}
          <div className="relative">
            <button 
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 relative cursor-pointer shadow-sm transition-all"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter(n => n.unread).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
                  {notifications.filter(n => n.unread).length}
                </span>
              )}
            </button>

            {/* Notification Menu List dropdown */}
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 text-left overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                  <strong className="text-xs text-slate-700">Notification Index</strong>
                  <div className="flex gap-2">
                    <button onClick={clearAllNotifications} className="text-[9px] hover:underline text-rose-500 font-bold">Clear All</button>
                    <button onClick={() => setShowNotificationsDropdown(false)} className="text-[9px] hover:underline text-slate-450 font-bold">Close</button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => markNotificationAsRead(n.id)}
                        className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${n.unread ? 'bg-sky-50/40 font-semibold' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            n.type === 'emergency' ? 'bg-rose-50 text-rose-600 border border-rose-150' : 
                            n.type === 'assignment' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100'
                          }`}>
                            {n.type.toUpperCase()}
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono">{n.time}</span>
                        </div>
                        <h4 className="text-[11px] font-bold text-slate-800 mt-1">{n.title}</h4>
                        <p className="text-[10px] text-slate-500 min-w-none break-words mt-0.5 leading-normal font-sans">{n.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No notifications active.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* CLINICIAN CORE BIOGRAPHY AND WELCOME SECTION */}
          <div className="bg-gradient-to-r from-[#0284C7] via-[#0369a1] to-teal-700 border border-slate-200/50 rounded-2xl p-6 relative overflow-hidden text-left shadow-lg text-white">
            <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-[40px] pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* Simulated professional dynamic photo frame */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white overflow-hidden flex items-center justify-center text-slate-600 shadow-md">
                    <User className="w-10 h-10" />
                  </div>
                  {/* Status beacon dot with interactive toggle status glow */}
                  <span className={`absolute bottom-0 right-0 h-4.5 w-4.5 border-2 border-white rounded-full ${getStatusDotColor()}`} />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] bg-white/20 text-white font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                      Physician Board Accredit
                    </span>
                    <span className="text-[9px] bg-emerald-500/30 text-white font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                      {docAvailabilityStatus === 'Available' ? 'LIVE INTAKE ACTIVE' : docAvailabilityStatus}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-white">{currentUser.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sky-100 font-mono text-[10px] mt-1">
                    <span>Specialty: <strong className="text-white">{docSpecialization}</strong></span>
                    <span>Experience: <strong className="text-white">{docExperience}</strong></span>
                    <span>Timing slots: <strong className="text-white">{docAvailability}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={onCallNext}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-sky-700 hover:text-sky-800 font-black rounded-xl text-xs transition-transform hover:-translate-y-0.5 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Call Next Patient</span>
                </button>
                <button
                  onClick={() => handlePrintReport('Daily')}
                  className="px-4 py-2.5 bg-sky-500/20 hover:bg-sky-500/35 text-white font-bold rounded-xl text-xs border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Daily Report PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* TODAY'S STATISTICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Today */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-2xl text-left shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full blur-[15px] pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients Today</span>
                <span className="p-2 bg-sky-50 text-[#0284C7] rounded-lg"><Users className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-mono font-extrabold text-slate-800 mt-2">{myPatients.length} Case files</div>
              <p className="text-[9px] text-slate-400 mt-1">Specialized OPD entries cumulative</p>
            </div>

            {/* Waiting Queue */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-2xl text-left shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-[15px] pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting Lounge</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} /></span>
              </div>
              <div className="text-2xl font-mono font-extrabold text-amber-600 mt-2">{myWaiting.length} Outpatients</div>
              <p className="text-[9px] text-slate-400 mt-1">Awaiting specialized admit</p>
            </div>

            {/* Completed */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-2xl text-left shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-[15px] pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Care</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-mono font-extrabold text-emerald-600 mt-2">{myCompleted.length} Dispatched</div>
              <p className="text-[9px] text-slate-400 mt-1">Prescribed & records locked</p>
            </div>

            {/* Emergency Priority */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-2xl text-left shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-[15px] pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emergency Alert</span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle className="w-4 h-4 animate-pulse text-rose-500" /></span>
              </div>
              <div className="text-2xl font-mono font-extrabold text-rose-600 mt-2">{myWaiting.filter(p => p.isEmergency).length} Priority</div>
              <p className="text-[9px] text-slate-400 mt-1">Immediate fast-track assigned</p>
            </div>

            {/* Average consultation */}
            <div className="bg-white border border-slate-200 p-4.5 rounded-2xl text-left shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full blur-[15px] pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Consultation</span>
                <span className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Activity className="w-4 h-4" /></span>
              </div>
              <div className="text-2xl font-mono font-extrabold text-slate-800 mt-2">12 Minutes</div>
              <p className="text-[9px] text-slate-400 mt-1">Clinical compliance avg pace</p>
            </div>

          </div>

          {/* WORKSPACE AREA: ACTIVE DESK + QUEUE LIST PREVIEW */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* ACTIVE Desk Consultation Form */}
            <div className="xl:col-span-5 space-y-6 text-left">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4 pb-2 border-b border-indigo-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-black text-slate-800">
                    <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
                    Clinical intake desk
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold px-2 py-0.5 rounded">
                    INTAKE DESK #1
                  </span>
                </h3>

                {myActive ? (
                  <form onSubmit={handleSaveConsultation} className="space-y-4">
                    <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] bg-sky-100 text-sky-800 font-mono font-bold px-2 py-0.5 rounded border border-sky-200">
                            OPD SLATE #{myActive.token}
                          </span>
                          <h4 className="text-sm font-black text-slate-800 mt-1">{myActive.name}</h4>
                        </div>
                        {myActive.isEmergency && (
                          <span className="text-[8px] bg-rose-500 text-white font-mono px-2 py-0.5 rounded-full font-bold animate-pulse">
                            EMERGENCY PRIORITY
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2.5 rounded-lg border border-slate-150/80 font-mono">
                        <div><span className="text-slate-400">AGE:</span> <strong className="text-slate-700">{myActive.age || 29} Yrs</strong></div>
                        <div><span className="text-slate-400">GENDER:</span> <strong className="text-slate-700">{myActive.gender || 'Female'}</strong></div>
                        <div className="col-span-2"><span className="text-slate-400">PHONE:</span> <strong className="text-slate-700">{myActive.phone || '+1 (555) 0184'}</strong></div>
                      </div>

                      {myActive.problemDescription && (
                        <div className="text-xs bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Intake Symptoms / Problem Description:</span>
                          <p className="text-slate-700 font-medium mt-0.5 whitespace-pre-line leading-normal">{myActive.problemDescription}</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline of patient history for currently loaded active case in desk */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Patient History Timeline</label>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 max-h-36 overflow-y-auto space-y-3">
                        {recordsLoading ? (
                          <div className="p-4 text-center text-xs text-slate-450 font-mono">Syncing history catalog...</div>
                        ) : historicalRecords.length > 0 ? (
                          historicalRecords.map(rec => (
                            <div key={rec._id} className="text-xs border-l-2 border-sky-400 pl-3 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="font-bold">{rec.date}</span>
                                <span className="font-mono">{rec.doctorName} (OPD)</span>
                              </div>
                              <p className="font-bold text-slate-800">Diag: {rec.diagnosis}</p>
                              <p className="text-slate-600 text-[11px]">Symptom summary: {rec.symptoms}</p>
                              {rec.medicines && rec.medicines.length > 0 && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Prescribed: {rec.medicines.map(m => m.name).join(', ')}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-slate-400 text-[10px] italic">
                            No previous visits on file. First consultation.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Clinical entries inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Presented Symptoms</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Cold, heavy chest congestion, fever for 3 days"
                          value={diagnosisSymptoms}
                          onChange={(e) => setDiagnosisSymptoms(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all text-slate-800 font-sans"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Clinical Diagnosis / Disease (Required)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Acute Bronchitis"
                          value={diagnosisSummary}
                          onChange={(e) => setDiagnosisSummary(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all text-slate-800 font-sans font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block">Medicines and Dosage Formulation</label>
                        <div className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl space-y-2.5">
                          {medicinesList.map((med, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-150 text-[11px] font-mono">
                              <div>
                                <strong className="text-slate-800">{med.name}</strong> • {med.dosage} ({med.duration})
                                <div className="text-[9px] text-slate-403 font-sans italic">{med.instructions}</div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveMedicine(idx)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-150/80">
                            <input
                              type="text"
                              placeholder="Meds Name / Salt"
                              value={newMedName}
                              onChange={(e) => setNewMedName(e.target.value)}
                              className="col-span-2 bg-white border border-slate-200 rounded-lg p-1.5 pr-8 text-xs focus:outline-none text-slate-800"
                            />
                            <select 
                              value={newMedDosage} 
                              onChange={(e) => setNewMedDosage(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700"
                            >
                              <option value="1-0-1">1-0-1 (BID)</option>
                              <option value="1-1-1">1-1-1 (TID)</option>
                              <option value="0-0-1">0-0-1 (OD - Night)</option>
                              <option value="1-0-0">1-0-0 (OD - morning)</option>
                              <option value="0-1-0">0-1-0 (OD - Noon)</option>
                              <option value="SOS">SOS (As Needed)</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Duration, e.g. 5 Days"
                              value={newMedDuration}
                              onChange={(e) => setNewMedDuration(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800"
                            />
                            <input
                              type="text"
                              placeholder="e.g. After meals"
                              value={newMedInstructions}
                              onChange={(e) => setNewMedInstructions(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs col-span-2 text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={handleAddMedicine}
                              className="col-span-2 py-1.5 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:text-sky-900 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-sky-100"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Append Medicine Line</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Consultation Advice & Medical Observation</label>
                        <textarea
                          placeholder="Diet guidelines, rest advisance, specific dosage precautions..."
                          value={consultationNotes}
                          onChange={(e) => setConsultationNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-xs text-slate-800 h-16 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all resize-none font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-mono">Follow-up Date</label>
                          <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-xs focus:outline-none text-slate-705"
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={handlePrintPrescription}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200 shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Preview / Print Rx</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 hover:-translate-y-0.5"
                    >
                      <Check className="w-4 h-4 text-white" />
                      <span>Archive & Dispatch Patient</span>
                    </button>
                  </form>
                ) : (
                  <div className="py-16 text-center text-slate-400 space-y-3">
                    <User className="w-12 h-12 text-slate-300 mx-auto" />
                    <h5 className="text-xs font-bold text-slate-500">Intake Chair unoccupied</h5>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                      Click "Call Next Patient" in the top dashboard console or "Admit" in the waiting registry table to admit a patient.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* PREVIEW PATIENTS QUEUE FOR DECK INTENT */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden text-left flex flex-col shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">My Waiting Queue</span>
                <span className="text-[10px] text-sky-700 font-bold bg-sky-50 border border-sky-150 px-2 py-0.5 rounded-full">
                  {myWaiting.length} Outpatients Pending
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                {myWaiting.length > 0 ? (
                  myWaiting.map((p) => (
                    <div key={p._id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-all gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-sky-50 text-sky-705 border border-sky-150 font-mono font-bold px-1.5 py-0.2 rounded">
                            TKT #{p.token}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{p.name}</span>
                          {p.isEmergency && (
                            <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded animate-pulse font-bold font-mono">
                              EMERGENCY PRIORITY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-450 font-mono flex-wrap">
                          <span>Age/Sex: <strong className="text-slate-600">{p.age || '34'} / {p.gender || 'Female'}</strong></span>
                          <span>Phone: <strong className="text-slate-600">{p.phone || '+1 (555) 0199'}</strong></span>
                          <span>Time: <strong className="text-slate-600">{p.appointmentTime || 'N/A'}</strong></span>
                        </div>
                        {p.problemDescription && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100/60 rounded px-2 py-0.5 mt-0.5 max-w-sm font-sans truncate" title={p.problemDescription}>
                            <span className="font-bold text-slate-400 font-mono text-[9px] uppercase mr-1">Symptoms:</span>
                            {p.problemDescription}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => onUpdatePatientStatus(p._id, 'called')}
                        className="py-1.5 px-3 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 hover:border-sky-600 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3" />
                        <span>Admit Case</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-16 text-center text-slate-400 py-24">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500">Specialty waitlist cleared</p>
                    <p className="text-[10px] text-slate-400 mt-1">Both emergency lists and normal scheduling are currently updated.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* BEAUTIFUL CHARTS SECTION (ANALYTICS DASHBOARD) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            
            {/* Chart 1: Patients Seen Today (Hour-wise) */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patients seen today (Hourly Trend)</h3>
                <span className="text-[10px] text-slate-400">Total processed cases hour-by-hour (09:00 AM - 06:00 PM)</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patientsSeenData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }} />
                    <Bar dataKey="count" fill="#0275B2" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Appointment Status Breakdown (Pie Chart) */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Queue Distribution</h3>
                <span className="text-[10px] text-slate-400">Active categorization breakdown of specialized list</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-64">
                <div className="h-56 w-56 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={appointmentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {appointmentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Absolute center marker */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total OPD</span>
                    <span className="text-xl font-mono font-black text-slate-800">
                      {(myPatients.length)}
                    </span>
                  </div>
                </div>

                {/* Map legends */}
                <div className="space-y-2 text-xs font-mono font-semibold self-stretch flex flex-col justify-center">
                  {appointmentStatusData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-slate-500 w-28">{d.name}:</span>
                      <strong className="text-slate-800">{d.value} Case{d.value > 1 ? 's' : ''}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Weekly Patient Trend */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Ingress trends</h3>
                <span className="text-[10px] text-slate-400">Monday to Sunday comprehensive processed loads</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyPatientData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }} />
                    <Line type="monotone" dataKey="count" stroke="#0F766E" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Consultation Performance (Area Chart) */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Consultation performance</h3>
                <span className="text-[10px] text-slate-400">Mean consultation time expended per patient (Daily statistics)</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={avgConsultationTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }} />
                    <Area type="monotone" dataKey="minutes" stroke="#0284C7" fill="rgba(2, 132, 199, 0.15)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* COHORT Lounging List Tab / Search filters */}
      {activeTab === 'patient-queue' && (
        <div className="space-y-6 text-left">
          
          {/* Lookup & filter criteria */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-600" /> Clinic OPD search & Filter Center
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Query patient details by name, direct ticket token, or reference phone..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 py-2.5 pl-9 pr-4 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-505 transition-all"
                />
              </div>

              <div className="md:col-span-4 select-container">
                <select
                  value={historyStatusFilter}
                  onChange={(e: any) => setHistoryStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 py-2.5 px-3 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                >
                  <option value="all">All Today's Registries</option>
                  <option value="waiting">Waiting (Normal)</option>
                  <option value="emergency">Emergency Priority</option>
                  <option value="called">In Consult Desk</option>
                  <option value="completed">Completed / Discharged</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cohort table matching Practo/Apollo Hospitals styles */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Specialized Outpatients OPD Registry</span>
              <span className="text-[10px] font-bold text-slate-500 font-mono">Count: {filteredHistoryPatients.length} Record lines matches</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="p-4 text-left border-b border-slate-150">Token</th>
                    <th className="p-4 text-left border-b border-slate-150">Outpatient Name</th>
                    <th className="p-4 text-left border-b border-slate-150 font-mono">Age / Sex</th>
                    <th className="p-4 text-left border-b border-slate-150">Contact Phone</th>
                    <th className="p-4 text-left border-b border-slate-150">Appt Slot Time</th>
                    <th className="p-4 text-left border-b border-slate-150">Doctor Consultant</th>
                    <th className="p-4 text-center border-b border-slate-150">Current Status</th>
                    <th className="p-4 text-center border-b border-slate-150">Action commands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredHistoryPatients.length > 0 ? (
                    filteredHistoryPatients.map((pat) => (
                      <tr key={pat._id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 font-mono font-black text-slate-400">#{pat.token}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800">{pat.name}</span>
                            {pat.isEmergency && (
                              <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-150 px-1.5 py-0.2 rounded font-bold uppercase animate-pulse">
                                URGENT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-600">{pat.age || 28} Y / {pat.gender || 'Male'}</td>
                        <td className="p-4 font-mono text-slate-650">{pat.phone || '+1 (555) 0184'}</td>
                        <td className="p-4 font-mono text-slate-800 font-bold">{pat.appointmentTime || '10:30 AM'}</td>
                        <td className="p-4 text-slate-605">{pat.doctorName}</td>
                        <td className="p-4 text-center font-mono">
                          <span className={`inline-block text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                            pat.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                            pat.status === 'called' ? 'bg-sky-50 text-sky-700 border-sky-150' :
                            pat.isEmergency ? 'bg-rose-50 text-rose-700 border-rose-150 animate-pulse' :
                            'bg-amber-50 text-amber-700 border-amber-150'
                          }`}>
                            {pat.isEmergency && pat.status === 'waiting' ? 'EMERGENCY' : pat.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {pat.status === 'waiting' ? (
                            <button
                              onClick={() => {
                                onUpdatePatientStatus(pat._id, 'called');
                                setSuccessInfo(`Admitting ${pat.name} to Consultation Desk.`);
                                setTimeout(() => setSuccessInfo(null), 3000);
                              }}
                              className="py-1 px-3 bg-sky-50 hover:bg-sky-600 text-[#0284C7] hover:text-white border border-sky-200 hover:border-sky-600 font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10px]"
                            >
                              <Play className="w-3 h-3" />
                              <span>Admit</span>
                            </button>
                          ) : pat.status === 'called' ? (
                            <span className="text-[10px] text-sky-700 font-bold font-mono">Currently in consult chair</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[9px] text-slate-450 font-mono flex items-center gap-1">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Discharged
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-slate-400">
                        <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <span className="font-bold text-xs text-slate-500 block">No matching OPD records found</span>
                        <p className="text-[10px] text-slate-400">Adjust clinical search strings or filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}

      {/* COMPLETED CLINICAL LOGFILES ARCHIVE VIEW */}
      {activeTab === 'completed-patients' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-left">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-slate-800">OPD Discharged Case Files</h3>
              <p className="text-xs text-slate-500">Appointments resolve log registry database of today</p>
            </div>
            <button
              onClick={() => handlePrintReport('Daily')}
              className="py-1.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-150 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Discharged Logs</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {myCompleted.length > 0 ? (
              myCompleted.map((pat) => (
                <div key={pat._id} className="p-5 space-y-3 hover:bg-slate-50/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-150 px-2 py-0.5 rounded">
                        RESOLVED TOKEN #{pat.token}
                      </span>
                      <span className="text-sm font-black text-slate-850">{pat.name}</span>
                      <span className="text-[8px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.2 uppercase font-mono font-bold">Clinical File Locked</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(pat.createdAt).toLocaleTimeString()} (Discharged)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-16 text-center text-slate-400 py-24">
                <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No OPD case resolved in this specialty session yet</p>
                <p className="text-[10px] text-slate-350 max-w-xs mx-auto">Admit pending cases from the Waitlist and write consultation notes to file records here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLINICAL ARCHIVE MEDICAL REGISTRY SEARCH TIMELINE */}
      {activeTab === 'patient-history' && (
        <div className="space-y-6 text-left">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-sky-650" /> Outpatient electronic Medical Records Finder (EMR)
            </h3>
            
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search history folder by spelling query, disease, doctor name, symptoms keyword key..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 hover:border-slate-300 focus:border-sky-505 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all font-sans"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-mono font-bold text-xs text-slate-700 uppercase tracking-wider">
              Discharged matching case summaries ({
                patients.filter(pat => 
                  pat.name.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                  (pat.phone && pat.phone.toLowerCase().includes(historySearchQuery.toLowerCase()))
                ).length
              })
            </div>

            <div className="divide-y divide-slate-100">
              {patients.filter(pat => 
                pat.name.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                (pat.phone && pat.phone.toLowerCase().includes(historySearchQuery.toLowerCase()))
              ).length > 0 ? (
                patients.filter(pat => 
                  pat.name.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                  (pat.phone && pat.phone.toLowerCase().includes(historySearchQuery.toLowerCase()))
                ).map((pat) => (
                  <div key={pat._id} className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-705 font-mono px-2 py-0.5 rounded border border-slate-202">
                          #{pat.token}
                        </span>
                        <strong className="text-sm font-black text-slate-800">{pat.name}</strong>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.2 rounded ${
                          pat.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' : 'bg-amber-50 text-amber-800 border border-amber-150'
                        }`}>
                          {pat.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-450 font-mono">Specialist assigned: {pat.doctorName}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-450 font-mono pt-1">
                      <div>Age/Sex: <strong className="text-slate-600">{pat.age || 28} Y / {pat.gender || 'Male'}</strong></div>
                      <div>Contact: <strong className="text-slate-600">{pat.phone || '+1 (555) 0199'}</strong></div>
                      <div>Ingress schedule: <strong className="text-slate-600">{pat.appointmentTime || '10:30 AM'}</strong></div>
                      <div>Appointment Date: <strong className="text-slate-604 font-bold">{pat.appointmentDate || 'Today'}</strong></div>
                    </div>

                    {pat.status === 'completed' ? (
                      <div className="bg-slate-55 p-3 rounded-xl border border-slate-150 text-xs text-slate-707 space-y-1 font-sans">
                        <p><strong className="text-slate-400 uppercase text-[9px] tracking-wide block">Direct Clinical Diagnosis:</strong> <span className="font-bold text-slate-800">Presented with heavy health parameters review</span></p>
                        <p className="mt-1"><strong className="text-slate-400 uppercase text-[9px] tracking-wide block">Locked Prescription regime:</strong> <span className="font-mono text-sky-800">Antihistamine BID x 5 Days SOS, lifestyle checks</span></p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No historical visits logged under this outpatient token folder currently.</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-16 text-center text-slate-400">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">No medical histories folder matched your query.</p>
                  <p className="text-[10px] text-slate-400">Verify names spelling or check general archive records desk.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE APPOINTMENT CALENDAR VIEW */}
      {activeTab === 'profile' && (
        <div className="max-w-4xl mx-auto space-y-6 text-left">
          
          {/* APPOINTMENT CALENDAR SLOT MATRIX */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-sky-600" /> Clinic Appointment Calendar slots
              </h3>
              <div className="flex items-center gap-1.5 bg-slate-50/50 p-1 border border-slate-200 rounded-xl">
                {(['daily', 'weekly', 'monthly'] as const).map(view => (
                  <button
                    key={view}
                    onClick={() => setCalendarView(view)}
                    className={`py-1 px-3 text-[10px] font-bold rounded-lg uppercase tracking-wider font-mono transition-colors cursor-pointer ${
                      calendarView === view ? 'bg-sky-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 7)))} className="hover:text-sky-650 cursor-pointer">« Previous Week</button>
              <span>SURVEILLANCE WORK WEEK: {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedDate.getTime() + 6 * 24*3600*1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 7)))} className="hover:text-sky-650 cursor-pointer">Next Week »</button>
            </div>

            {/* Grid display layout */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              {getCalendarSlots().map((slot, i) => (
                <div 
                  key={i} 
                  className={`p-3.5 border rounded-xl text-left transition-all ${
                    slot.status === 'Booked' ? 'bg-emerald-50/40 border-emerald-150/80 hover:bg-emerald-50' : 
                    slot.status === 'Busy' ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-bold text-slate-800">{slot.time}</span>
                    <span className={`text-[8px] uppercase font-bold px-1.5 rounded-full ${
                      slot.status === 'Booked' ? 'bg-emerald-100 text-emerald-800' : 
                      slot.status === 'Busy' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {slot.status}
                    </span>
                  </div>
                  {slot.patient ? (
                    <p className="text-xs font-black text-slate-800 mt-2 truncate leading-none">{slot.patient}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-2 truncate leading-none">Open slots slot</p>
                  )}
                  <span className="text-[9px] text-slate-400 mt-1 block">OPD consultation chair</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={updateDoctorProfile} className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 space-y-4 rounded-2xl shadow-sm">
              <h3 className="text-sm font-black text-slate-800 border-b border-indigo-50 pb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-650" /> Clinic Practitioner Accreditation bio details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Licensed Clinician</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.name}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-slate-500 cursor-not-allowed font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Access Email address</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.email}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Clinician Specialization sub-department</label>
                  <input
                    type="text"
                    required
                    value={docSpecialization}
                    onChange={(e) => setDocSpecialization(e.target.value)}
                    className="w-full bg-slate-10/40 border border-slate-250 hover:border-slate-350 focus:border-sky-505 rounded-xl py-2 px-3.5 text-xs text-slate-800 font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Practicing Experiential scope text</label>
                  <input
                    type="text"
                    required
                    value={docExperience}
                    onChange={(e) => setDocExperience(e.target.value)}
                    className="w-full bg-slate-10/40 border border-slate-250 hover:border-slate-350 focus:border-sky-505 rounded-xl py-2 px-3.5 text-xs text-slate-850 font-sans focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Default OP Timings slot</label>
                  <input
                    type="text"
                    required
                    value={docAvailability}
                    onChange={(e) => setDocAvailability(e.target.value)}
                    className="w-full bg-slate-10/40 border border-slate-250 hover:border-slate-350 focus:border-sky-505 rounded-xl py-2 px-3.5 text-xs text-slate-850 font-sans focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2.5">
                <span className="text-[10px] text-slate-400 font-mono">OPD syncs instantly with clinic display boards</span>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  Save Profile Accreditation
                </button>
              </div>
            </div>
          </form>

        </div>
      )}

    </div>
  );
};
