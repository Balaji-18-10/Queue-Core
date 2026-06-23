import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface Patient {
  _id: string;
  token: number;
  tokenNumberString?: string;
  name: string;
  status: 'waiting' | 'called' | 'completed';
  createdAt: string;
  isEmergency: boolean;
  doctorName: string;
  patientId?: string;
  doctorId?: string;
  age?: number;
  gender?: string;
  phone?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  problemDescription?: string;
  registrationDate?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'doctor' | 'receptionist';
  phone?: string;          // patient-only (deprecated)
  specialization?: string; // doctor-only
  experience?: string;     // doctor-only
  availability?: string;   // doctor-only
  selectedDoctor?: string; // patient-only: stores doctor's ID
  age?: number;            // patient-only
  gender?: string;         // patient-only
  appointmentDate?: string; // patient-only
  appointmentTime?: string; // patient-only
  createdAt: string;
}

export interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  doctorId: string;
  doctorName: string;
  tokenNumber: number;
  appointmentDate: string;
  appointmentTime: string;
  status: 'Waiting' | 'In Consultation' | 'Completed';
}

export interface ConsultationReport {
  tokenNumber: string;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  consultationDate: string;
}

export interface QueueSettings {
  consultationTime: number;
  currentToken: number;
}

export interface MedicalRecord {
  _id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  symptoms: string;
  diagnosis: string;
  notes: string;
  followUpDate?: string;
  medicines: {
    name: string;
    dosage: string;
    duration: string;
    instructions: string;
  }[];
  createdAt: string;
}

function getInitialMedicalRecords(): MedicalRecord[] {
  return [
    {
      _id: "mr1",
      patientId: "u_pat1",
      patientName: "Eleanor Shellstrop",
      doctorId: "u_doc1",
      doctorName: "Dr. Sarah Jenkins",
      date: "05/06/2026",
      symptoms: "Fever, watery eyes, running nose, fatigue",
      diagnosis: "Acute allergic rhinitis and mild viral fever",
      notes: "Patient is resting but reported fatigue. Vital parameters look stable. Fluid intake recommended.",
      followUpDate: "2026-06-25",
      medicines: [
        { name: "Levocetirizine 5mg", dosage: "0-0-1", duration: "5 Days", instructions: "After dinner" },
        { name: "Paracetamol 650mg", dosage: "1-0-1", duration: "3 Days", instructions: "After meals, SOS for fever" }
      ],
      createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString()
    },
    {
      _id: "mr2",
      patientId: "u_pat2",
      patientName: "Chidi Anagonye",
      doctorId: "u_doc2",
      doctorName: "Dr. Alex Patel",
      date: "12/06/2026",
      symptoms: "Stomach cramping, indigestion, anxiety-induced acidity",
      diagnosis: "Mild gastritis",
      notes: "Cramps triggered by severe lifestyle anxiety. Instructed relaxation exercises and bland dieting.",
      followUpDate: "2026-06-22",
      medicines: [
        { name: "Pantoprazole 40mg", dosage: "1-0-0", duration: "10 Days", instructions: "30 mins before breakfast" },
        { name: "Gelusil Antacid Syrup", dosage: "2 tsp", duration: "5 Days", instructions: "After lunch and dinner" }
      ],
      createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
    }
  ];
}

const DB_PATH = path.join(process.cwd(), 'db.json');

// Prepopulate database with realistic clinical data on first run
const INITIAL_PATIENTS: Patient[] = [
  {
    _id: "p1",
    token: 1,
    name: "Eleanor Shellstrop",
    status: "completed",
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
    isEmergency: false,
    doctorName: "Dr. Sarah Jenkins",
    patientId: "u_pat1",
    doctorId: "u_doc1",
    age: 34,
    gender: "Female",
    phone: "+919876543210",
    appointmentDate: new Date().toLocaleDateString('en-GB'),
    appointmentTime: "09:15 AM",
    problemDescription: "High fever, body chills, watery eyes, and continuous nasal discharge since yesterday."
  },
  {
    _id: "p2",
    token: 2,
    name: "Chidi Anagonye",
    status: "completed",
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    isEmergency: false,
    doctorName: "Dr. Alex Patel",
    patientId: "u_pat2",
    doctorId: "u_doc2",
    age: 36,
    gender: "Male",
    phone: "+919765432109",
    appointmentDate: new Date().toLocaleDateString('en-GB'),
    appointmentTime: "10:00 AM",
    problemDescription: "Stomach cramping, recurring acidity, and indigestion due to work-related stress."
  },
  {
    _id: "p3",
    token: 3,
    name: "Arthur Dent",
    status: "called",
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    isEmergency: false,
    doctorName: "Dr. Sarah Jenkins",
    patientId: "pat_arthur",
    doctorId: "u_doc1",
    age: 42,
    gender: "Male",
    phone: "+919654321098",
    appointmentDate: new Date().toLocaleDateString('en-GB'),
    appointmentTime: "11:30 AM",
    problemDescription: "Frequent dizzy spells, low energy levels, and mild dehydration after traveling."
  },
  {
    _id: "p4",
    token: 4,
    name: "Sarah Connor",
    status: "waiting",
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    isEmergency: true,
    doctorName: "Dr. Eleanor Vance",
    patientId: "pat_sarah_c",
    doctorId: "u_doc3",
    age: 29,
    gender: "Female",
    phone: "+919543210987",
    appointmentDate: new Date().toLocaleDateString('en-GB'),
    appointmentTime: "02:15 PM",
    problemDescription: "Chest tightness, sudden shortness of breath, and pounding pulse rate under exertion."
  },
  {
    _id: "p5",
    token: 5,
    name: "Bruce Banner",
    status: "waiting",
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    isEmergency: false,
    doctorName: "Dr. Alex Patel",
    patientId: "pat_banner",
    doctorId: "u_doc2",
    age: 49,
    gender: "Male",
    phone: "+919432109876",
    appointmentDate: new Date().toLocaleDateString('en-GB'),
    appointmentTime: "03:45 PM",
    problemDescription: "Joint pain, stiffness in fingers, and exhaustion following repetitive high-impact physical exercise."
  },
  {
    _id: "p6",
    token: 6,
    name: "Diana Prince",
    status: "waiting",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    isEmergency: false,
    doctorName: "Dr. Eleanor Vance",
    patientId: "pat_diana",
    doctorId: "u_doc3",
    age: 32,
    gender: "Female",
    phone: "+919321098765",
    appointmentDate: new Date().toLocaleDateString('en-GB'),
    appointmentTime: "04:30 PM",
    problemDescription: "Slight inflammation of throat, pain while swallowing warm liquids, and persistent dryness."
  }
];

const INITIAL_SETTINGS: QueueSettings = {
  consultationTime: 12, // default 12 minutes per consultation
  currentToken: 3 // Current patient being called is token 3
};

function getInitialUsers(): User[] {
  const salt = bcrypt.genSaltSync(10);
  return [
    {
      _id: "u_recep",
      name: "Jane Doe",
      email: "receptionist@queuecure.com",
      passwordHash: bcrypt.hashSync("recep123", salt),
      role: "receptionist",
      createdAt: new Date().toISOString()
    },
    {
      _id: "u_doc1",
      name: "Dr. Sarah Jenkins",
      email: "doctor.jenkins@queuecure.com",
      passwordHash: bcrypt.hashSync("doctor123", salt),
      role: "doctor",
      specialization: "General Practitioner",
      experience: "8 Years Experience",
      availability: "Mon-Fri 9:00 AM - 1:00 PM",
      createdAt: new Date().toISOString()
    },
    {
      _id: "u_doc2",
      name: "Dr. Alex Patel",
      email: "doctor.patel@queuecure.com",
      passwordHash: bcrypt.hashSync("doctor123", salt),
      role: "doctor",
      specialization: "Pediatrics",
      experience: "5 Years Experience",
      availability: "Mon-Fri 10:00 AM - 4:00 PM",
      createdAt: new Date().toISOString()
    },
    {
      _id: "u_doc3",
      name: "Dr. Eleanor Vance",
      email: "doctor.vance@queuecure.com",
      passwordHash: bcrypt.hashSync("doctor123", salt),
      role: "doctor",
      specialization: "Cardiology",
      experience: "12 Years Experience",
      availability: "Mon-Thu 2:00 PM - 6:00 PM",
      createdAt: new Date().toISOString()
    }
  ];
}

function getInitialConsultationReports(): ConsultationReport[] {
  return [
    {
      tokenNumber: "QC001",
      patientName: "Eleanor Shellstrop",
      doctorName: "Dr. Sarah Jenkins",
      diagnosis: "Acute allergic rhinitis and mild viral fever",
      prescription: "Levocetirizine 5mg - 0-0-1 (5 Days)\nParacetamol 650mg - 1-0-1 (3 Days)",
      notes: "Patient is resting but reported fatigue. Vital parameters look stable. Fluid intake recommended.",
      consultationDate: "05/06/2026"
    },
    {
      tokenNumber: "QC002",
      patientName: "Chidi Anagonye",
      doctorName: "Dr. Alex Patel",
      diagnosis: "Mild gastritis and lifestyle-induced hyperacidity",
      prescription: "Pantoprazole 40mg - 1-0-0 (10 Days)\nGelusil Antacid Syrup - 2 tsp (5 Days)",
      notes: "Cramps triggered by severe lifestyle anxiety. Instructed relaxation exercises and bland dieting.",
      consultationDate: "12/06/2026"
    }
  ];
}

interface DbSchema {
  patients: Patient[];
  settings: QueueSettings;
  users: User[];
  appointments: Appointment[];
  medicalRecords?: MedicalRecord[];
  consultationReports?: ConsultationReport[];
}

function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDb: DbSchema = { 
         patients: INITIAL_PATIENTS, 
         settings: INITIAL_SETTINGS, 
         users: getInitialUsers(), 
         appointments: [],
         medicalRecords: getInitialMedicalRecords(),
         consultationReports: getInitialConsultationReports()
      };
      writeDb(initialDb);
      return initialDb;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.users) {
      parsed.users = getInitialUsers();
    }
    if (!parsed.appointments) {
      parsed.appointments = [];
    }
    if (!parsed.medicalRecords) {
      parsed.medicalRecords = getInitialMedicalRecords();
    }
    if (!parsed.consultationReports) {
      parsed.consultationReports = getInitialConsultationReports();
    }
    if (!parsed.patients) {
      parsed.patients = [];
    }
    parsed.patients = parsed.patients.map((p: Patient) => {
      if (!p.tokenNumberString) {
        p.tokenNumberString = `QC${String(p.token).padStart(3, '0')}`;
      }
      if (!p.registrationDate) {
        p.registrationDate = p.appointmentDate || p.createdAt || new Date().toLocaleDateString('en-GB');
      }
      return p;
    });

    // Also upgrade any users who are doctors if they don't have experience or availability
    parsed.users = parsed.users.map((u: User) => {
      if (u.role === 'doctor') {
        if (!u.experience) u.experience = "8 Years Experience";
        if (!u.availability) u.availability = "Mon-Fri 9:00 AM - 5:00 PM";
      }
      return u;
    });
    return parsed;
  } catch (error) {
    console.error("Error reading db file, returning initialized state", error);
    const fallbackPatients = INITIAL_PATIENTS.map(p => ({
      ...p,
      tokenNumberString: `QC${String(p.token).padStart(3, '0')}`,
      registrationDate: p.appointmentDate || new Date().toLocaleDateString('en-GB')
    }));
    return { 
      patients: fallbackPatients, 
      settings: INITIAL_SETTINGS, 
      users: getInitialUsers(), 
      appointments: [],
      medicalRecords: getInitialMedicalRecords(),
      consultationReports: getInitialConsultationReports()
    };
  }
}

function writeDb(data: DbSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing db file", error);
  }
}

export const db = {
  // GET all patients
  getPatients(): Patient[] {
    return readDb().patients;
  },

  // GET queue settings
  getSettings(): QueueSettings {
    return readDb().settings;
  },

  // UPDATE queue settings
  updateSettings(updates: Partial<QueueSettings>): QueueSettings {
    const data = readDb();
    data.settings = { ...data.settings, ...updates };
    writeDb(data);
    return data.settings;
  },

  // Check if slot is booked
  isSlotBooked(doctorId: string, date: string, time: string): boolean {
    const data = readDb();
    const cleanDocId = doctorId ? doctorId.trim() : "";
    const cleanDate = date ? date.trim() : "";
    const cleanTime = time ? time.trim() : "";
    if (!cleanDocId || !cleanDate || !cleanTime) return false;

    return data.patients.some(p => 
      p.doctorId === cleanDocId && 
      p.appointmentDate === cleanDate && 
      p.appointmentTime === cleanTime &&
      p.status !== 'completed'
    );
  },

  // POST patient
  addPatient(patientInput: { 
    name: string; 
    isEmergency?: boolean; 
    doctorName?: string; 
    patientId?: string; 
    doctorId?: string;
    age?: number;
    gender?: string;
    phone?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    problemDescription?: string;
  }): Patient {
    const data = readDb();
    
    // Auto-generate next token number
    // Find the max token number for today (simply take the maximum token value + 1)
    const maxToken = data.patients.reduce((max, p) => p.token > max ? p.token : max, 0);
    const nextToken = maxToken + 1;

    let finalDoctorId = patientInput.doctorId || "";
    let finalDoctorName = patientInput.doctorName || "General Practitioner";

    // If we only have doctorName, try to find doctorId
    if (!finalDoctorId && patientInput.doctorName) {
      const matchedDoc = data.users.find(u => 
        u.role === 'doctor' && 
        (patientInput.doctorName!.toLowerCase().includes(u.name.toLowerCase()) || 
         u.name.toLowerCase().includes(patientInput.doctorName!.toLowerCase()))
      );
      if (matchedDoc) {
        finalDoctorId = matchedDoc._id;
        finalDoctorName = matchedDoc.name;
      }
    }
    // If we only have doctorId, try to find doctorName
    if (finalDoctorId && !patientInput.doctorName) {
      const matchedDoc = data.users.find(u => u._id === finalDoctorId);
      if (matchedDoc) {
        finalDoctorName = matchedDoc.name;
      }
    }

    const finalPatientId = patientInput.patientId || 'pat_anon_' + Math.random().toString(36).substr(2, 9);
    const tokenStr = `QC${String(nextToken).padStart(3, '0')}`;
    const defaultDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

    const newPatient: Patient = {
      _id: 'pat_' + Math.random().toString(36).substr(2, 9),
      token: nextToken,
      tokenNumberString: tokenStr,
      name: patientInput.name.trim() || `Patient #${nextToken}`,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      isEmergency: !!patientInput.isEmergency,
      doctorName: finalDoctorName,
      patientId: finalPatientId,
      doctorId: finalDoctorId,
      age: patientInput.age ? Number(patientInput.age) : undefined,
      gender: patientInput.gender,
      phone: patientInput.phone,
      appointmentDate: patientInput.appointmentDate || defaultDate,
      appointmentTime: patientInput.appointmentTime || "10:30 AM",
      problemDescription: patientInput.problemDescription || "",
      registrationDate: patientInput.appointmentDate || defaultDate
    };

    data.patients.push(newPatient);

    // Synchronize Appointment record
    const statusMap: Record<string, 'Waiting' | 'In Consultation' | 'Completed'> = {
      'waiting': 'Waiting',
      'called': 'In Consultation',
      'completed': 'Completed'
    };
    const newAppointment: Appointment = {
      _id: 'apt_' + Math.random().toString(36).substr(2, 9),
      patientId: finalPatientId,
      patientName: newPatient.name,
      patientPhone: newPatient.phone,
      doctorId: finalDoctorId,
      doctorName: finalDoctorName,
      tokenNumber: nextToken,
      appointmentDate: newPatient.appointmentDate || defaultDate,
      appointmentTime: newPatient.appointmentTime || "10:30 AM",
      status: statusMap['waiting']
    };
    data.appointments.push(newAppointment);

    writeDb(data);
    return newPatient;
  },

  // CALL next patient (updates current token to the next waiting patient's token)
  callNextPatient(): { nextPatient: Patient | null; currentToken: number; previousPatient: Patient | null } {
    const data = readDb();
    
    // Find previously 'called' patient for reference (without automatic status update to completed)
    const previousPatient = data.patients.find(p => p.status === 'called') || null;

    // Strategy for finding the next patient:
    // First, look for any 'waiting' emergency patients, sorted chronologically.
    // Second, look for regular 'waiting' patients, sorted chronologically.
    const waitingPatients = data.patients.filter(p => p.status === 'waiting');
    
    let nextPatient: Patient | null = null;
    
    if (waitingPatients.length > 0) {
      // Find emergency first
      const emergencyWaiting = waitingPatients.filter(p => p.isEmergency);
      if (emergencyWaiting.length > 0) {
        nextPatient = emergencyWaiting[0];
      } else {
        nextPatient = waitingPatients[0];
      }
    }

    if (nextPatient) {
      // Set status to called
      const targetId = (nextPatient as Patient)._id;
      data.patients = data.patients.map(p => {
        if (p._id === targetId) {
          return { ...p, status: 'called' as const };
        }
        return p;
      });
      data.settings.currentToken = (nextPatient as Patient).token;
    }

    writeDb(data);
    return {
      nextPatient,
      currentToken: data.settings.currentToken,
      previousPatient
    };
  },

  // Manual status update (e.g. mark completed, called, or waiting)
  updatePatientStatus(id: string, status: 'waiting' | 'called' | 'completed'): Patient | null {
    const data = readDb();
    const index = data.patients.findIndex(p => p._id === id);
    if (index === -1) return null;

    const patient = data.patients[index];
    patient.status = status;

    // Direct appointment status map
    const statusMap: Record<string, 'Waiting' | 'In Consultation' | 'Completed'> = {
      'waiting': 'Waiting',
      'called': 'In Consultation',
      'completed': 'Completed'
    };

    // If manually marking called, update current token, but DO NOT modify other called patients
    if (status === 'called') {
      data.settings.currentToken = patient.token;
    }

    // Sync current patient's appointment status
    const apt = data.appointments.find(a => a.tokenNumber === patient.token);
    if (apt) {
      apt.status = statusMap[status];
    }

    writeDb(data);
    return patient;
  },

  // Reschedule patient appointment date and time
  reschedulePatient(id: string, date: string, time: string): Patient | null {
    const data = readDb();
    const index = data.patients.findIndex(p => p._id === id);
    if (index === -1) return null;

    const patient = data.patients[index];
    patient.appointmentDate = date;
    patient.appointmentTime = time;

    // Sync appointment collection
    const apt = data.appointments.find(a => a.tokenNumber === patient.token);
    if (apt) {
      apt.appointmentDate = date;
      apt.appointmentTime = time;
    }

    writeDb(data);
    return patient;
  },

  // EDIT patient metadata (e.g., receptionist updating name, isEmergency, doctorName, age, gender)
  editPatient(id: string, updates: { name?: string; isEmergency?: boolean; doctorName?: string; age?: number; gender?: string; phone?: string; problemDescription?: string }): Patient | null {
    const data = readDb();
    const index = data.patients.findIndex(p => p._id === id);
    if (index === -1) return null;

    const patient = data.patients[index];
    if (updates.name !== undefined) patient.name = updates.name.trim();
    if (updates.isEmergency !== undefined) patient.isEmergency = updates.isEmergency;
    if (updates.doctorName !== undefined) {
      patient.doctorName = updates.doctorName;
      // also try updating doctorId if matching doctorName is found
      const matchedDoc = data.users.find(u => u.role === 'doctor' && (updates.doctorName!.toLowerCase().includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(updates.doctorName!.toLowerCase())));
      if (matchedDoc) {
        patient.doctorId = matchedDoc._id;
      }
    }
    if (updates.age !== undefined) patient.age = updates.age;
    if (updates.gender !== undefined) patient.gender = updates.gender;
    if (updates.phone !== undefined) patient.phone = updates.phone;
    if (updates.problemDescription !== undefined) patient.problemDescription = updates.problemDescription;

    // Sync appointment collection
    const apt = data.appointments.find(a => a.tokenNumber === patient.token);
    if (apt) {
      if (updates.name !== undefined) apt.patientName = updates.name.trim();
      if (updates.phone !== undefined) apt.patientPhone = updates.phone;
      if (updates.doctorName !== undefined) {
        apt.doctorName = updates.doctorName;
        if (patient.doctorId) apt.doctorId = patient.doctorId;
      }
    }

    writeDb(data);
    return patient;
  },

  // GET all appointments
  getAppointments(): Appointment[] {
    return readDb().appointments;
  },

  // UPDATE user account (e.g. doctor name, specialization, experience, availability)
  updateUser(id: string, updates: Partial<User>): User | null {
    const data = readDb();
    const index = data.users.findIndex(u => u._id === id);
    if (index === -1) return null;

    const user = { ...data.users[index], ...updates };
    data.users[index] = user;
    writeDb(data);
    return user;
  },

  // DELETE patient by id with sequential token reassignment and caller promotion
  deletePatient(id: string): { success: boolean; promotedPatient: Patient | null } {
    const data = readDb();
    const patientToDelete = data.patients.find(p => p._id === id);
    if (!patientToDelete) {
      return { success: false, promotedPatient: null };
    }

    const wasCurrentToken = (patientToDelete.status === 'called' || patientToDelete.token === data.settings.currentToken);
    
    // Filter out the deleted patient
    data.patients = data.patients.filter(p => p._id !== id);

    // Reassign token numbers sequentially based on their relative original token order
    data.patients.sort((a, b) => a.token - b.token);
    
    data.patients = data.patients.map((p, index) => {
      return { ...p, token: index + 1 };
    });

    let promotedPatient: Patient | null = null;

    if (wasCurrentToken) {
      // Find the next valid candidate from the newly reallocated patients whose status is 'waiting'
      const waitingPatients = data.patients.filter(p => p.status === 'waiting');
      if (waitingPatients.length > 0) {
        // Find emergency first if any exist
        const emergencyWaiting = waitingPatients.filter(p => p.isEmergency);
        const nextCandidate = emergencyWaiting.length > 0 ? emergencyWaiting[0] : waitingPatients[0];
        
        // Mark as called
        data.patients = data.patients.map(p => {
          if (p._id === nextCandidate._id) {
            promotedPatient = { ...p, status: 'called' as const };
            return promotedPatient;
          }
          return p;
        });
        
        data.settings.currentToken = promotedPatient!.token;
      } else {
        // No waiting patient left!
        data.settings.currentToken = 0;
      }
    } else {
      // If the deleted patient was NOT the current token but had a smaller token number,
      // the currentToken's numerical token has decreased because of reassigning sequentially.
      // Let's find the current token patient in the updated list and sync data.settings.currentToken to their new token.
      const currentPatient = data.patients.find(p => p.status === 'called');
      if (currentPatient) {
        data.settings.currentToken = currentPatient.token;
      } else {
        // If there's no active called patient in queue but data says otherwise, reset to 0
        data.settings.currentToken = 0;
      }
    }

    writeDb(data);

    return {
      success: true,
      promotedPatient
    };
  },

  // RESET or Clear entire queue
  resetQueue(): { patients: Patient[]; settings: QueueSettings } {
    const currentDb = readDb();
    const freshDb: DbSchema = {
      patients: [],
      settings: {
        consultationTime: 10,
        currentToken: 0
      },
      users: currentDb.users,
      appointments: []
    };
    writeDb(freshDb);
    return {
      patients: freshDb.patients,
      settings: freshDb.settings
    };
  },

  // GET overall queue metrics/statistics for analytics
  getAnalytics() {
    const data = readDb();
    const patients = data.patients;
    
    const total = patients.length;
    const completed = patients.filter(p => p.status === 'completed').length;
    const waiting = patients.filter(p => p.status === 'waiting').length;
    const called = patients.filter(p => p.status === 'called').length;
    const emergencyCount = patients.filter(p => p.isEmergency).length;

    // Doctor wise distribution
    const doctorStats: { [key: string]: { total: number; waiting: number; completed: number } } = {};
    patients.forEach(p => {
      if (!doctorStats[p.doctorName]) {
        doctorStats[p.doctorName] = { total: 0, waiting: 0, completed: 0 };
      }
      doctorStats[p.doctorName].total++;
      if (p.status === 'waiting') doctorStats[p.doctorName].waiting++;
      if (p.status === 'completed') doctorStats[p.doctorName].completed++;
    });

    const averageWaitTime = data.settings.consultationTime;

    return {
      statusBreakdown: {
        total,
        completed,
        waiting,
        called
      },
      emergencyCount,
      doctorBreakdown: Object.entries(doctorStats).map(([name, stats]) => ({
        doctor: name,
        ...stats
      })),
      consultationTime: averageWaitTime,
      totalEstimatedWaitMinutes: waiting * averageWaitTime
    };
  },

  // User Management
  getUsers(): User[] {
    return readDb().users;
  },

  findUserByEmail(email: string): User | null {
    const emailLower = email ? email.toLowerCase().trim() : '';
    if (!emailLower) return null;
    return readDb().users.find(u => u.email.toLowerCase() === emailLower) || null;
  },

  addUser(userInput: { 
    name: string; 
    email: string; 
    passwordHash: string; 
    role: 'doctor' | 'receptionist'; 
    phone?: string; 
    specialization?: string;
    experience?: string;
    availability?: string;
    selectedDoctor?: string;
    age?: number;
    gender?: string;
    appointmentDate?: string;
    appointmentTime?: string;
  }): User {
    const data = readDb();
    const newUser: User = {
      _id: 'usr_' + Math.random().toString(36).substring(2, 11),
      name: userInput.name.trim(),
      email: userInput.email.toLowerCase().trim(),
      passwordHash: userInput.passwordHash,
      role: userInput.role,
      phone: userInput.phone,
      specialization: userInput.specialization,
      experience: userInput.experience,
      availability: userInput.availability,
      selectedDoctor: userInput.selectedDoctor,
      age: userInput.age,
      gender: userInput.gender,
      appointmentDate: userInput.appointmentDate,
      appointmentTime: userInput.appointmentTime,
      createdAt: new Date().toISOString()
    };
    data.users.push(newUser);
    writeDb(data);
    return newUser;
  },

  deleteUser(id: string): boolean {
    const data = readDb();
    const initialCount = data.users.length;
    data.users = data.users.filter(u => u._id !== id);
    const success = data.users.length < initialCount;
    if (success) {
      writeDb(data);
    }
    return success;
  },

  getMedicalRecords(patientId?: string, patientName?: string): MedicalRecord[] {
    const data = readDb();
    const records = data.medicalRecords || [];
    if (patientId) {
      return records.filter(r => r.patientId === patientId);
    }
    if (patientName) {
      const q = patientName.toLowerCase();
      return records.filter(r => r.patientName.toLowerCase().includes(q));
    }
    return records;
  },

  addMedicalRecord(recordInput: Omit<MedicalRecord, '_id' | 'createdAt'>): MedicalRecord {
    const data = readDb();
    if (!data.medicalRecords) {
      data.medicalRecords = [];
    }
    const newRecord: MedicalRecord = {
      ...recordInput,
      _id: 'mr_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    data.medicalRecords.push(newRecord);
    
    // Also, if matching patient exists in the active patients today, update their status to completed
    const matchingPatientIdx = data.patients.findIndex(p => p.patientId === recordInput.patientId && p.status === 'called');
    if (matchingPatientIdx !== -1) {
      data.patients[matchingPatientIdx].status = 'completed';
    }

    // Automatically generate Consultation Report
    if (!data.consultationReports) {
      data.consultationReports = [];
    }
    
    const patientObj = matchingPatientIdx !== -1 
      ? data.patients[matchingPatientIdx] 
      : data.patients.find(u => u.patientId === recordInput.patientId || u.name === recordInput.patientName);
      
    const tokenNumber = patientObj && patientObj.tokenNumberString 
      ? patientObj.tokenNumberString 
      : (patientObj ? `QC${String(patientObj.token).padStart(3, '0')}` : 'QC001');

    const prescriptionText = (recordInput.medicines && recordInput.medicines.length > 0)
      ? recordInput.medicines.map((m: any) => `${m.name} - ${m.dosage} (${m.duration})${m.instructions ? ', ' + m.instructions : ''}`).join('\n')
      : 'No prescribed medications.';

    const newReport: ConsultationReport = {
      tokenNumber,
      patientName: recordInput.patientName,
      doctorName: recordInput.doctorName,
      diagnosis: recordInput.diagnosis,
      prescription: prescriptionText,
      notes: recordInput.notes || 'No extra clinical notes.',
      consultationDate: recordInput.date || new Date().toLocaleDateString('en-GB')
    };

    // Remove duplicates if any
    data.consultationReports = data.consultationReports.filter(r => r.tokenNumber !== tokenNumber);
    data.consultationReports.push(newReport);

    writeDb(data);
    return newRecord;
  },

  getConsultationReport(tokenNumber: string): ConsultationReport | null {
    const data = readDb();
    const reports = data.consultationReports || [];
    const cleanToken = tokenNumber.trim().toUpperCase();
    return reports.find(r => r.tokenNumber.toUpperCase() === cleanToken) || null;
  },
  
  addConsultationReport(report: ConsultationReport): ConsultationReport {
    const data = readDb();
    if (!data.consultationReports) data.consultationReports = [];
    data.consultationReports = data.consultationReports.filter(r => r.tokenNumber !== report.tokenNumber);
    data.consultationReports.push(report);
    writeDb(data);
    return report;
  }
};
