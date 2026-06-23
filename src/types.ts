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

export interface ConsultationReport {
  tokenNumber: string;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  consultationDate: string;
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

export interface QueueSettings {
  consultationTime: number;
  currentToken: number;
}

export interface DoctorWithStats {
  doctor: string;
  total: number;
  waiting: number;
  completed: number;
}

export interface QueueAnalytics {
  statusBreakdown: {
    total: number;
    completed: number;
    waiting: number;
    called: number;
  };
  emergencyCount: number;
  doctorBreakdown: DoctorWithStats[];
  consultationTime: number;
  totalEstimatedWaitMinutes: number;
}

