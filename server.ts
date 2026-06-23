import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db.js";
import { sendSMS } from "./server/sms.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;
  const jwtSecret = process.env.JWT_SECRET || 'queuecure_secret_key_123_abc';

  // Helper Middleware for route-level protection
  function requireAuth(req: any, res: any, next: any) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header is missing' });
      }
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret) as any;
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }
  }

  function requireRole(roles: string[]) {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Access Denied: Required role matches ${roles.join(' or ')}` });
      }
      next();
    };
  }

  // Initialize Socket.IO configured for maximum compatibility in nested framing
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    },
    transports: ["polling", "websocket"] // allow HTTP polling fallbacks to ensure zero connectivity blocks
  });

  app.use(express.json());

  // --- AUTH REST ENDPOINTS ---

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = db.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const matches = bcrypt.compareSync(password, user.passwordHash);
      if (!matches) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const payload = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        phone: user.phone
      };

      const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
      res.json({ token, user: payload });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/register-doctor", (req, res) => {
    try {
      const { name, email, password, specialization, experience, availability } = req.body;
      if (!name || !email || !password || !specialization) {
        return res.status(400).json({ error: "Name, email, password, and specialization are required" });
      }
      const existing = db.findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      const newUser = db.addUser({
        name,
        email,
        passwordHash,
        role: 'doctor',
        specialization,
        experience: experience || "8 Years Experience",
        availability: availability || "Mon-Fri 9:00 AM - 5:00 PM"
      });

      const payload = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        specialization: newUser.specialization,
        experience: newUser.experience,
        availability: newUser.availability
      };

      const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
      res.status(201).json({ token, user: payload });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    res.json(req.user);
  });

  app.get("/api/public/doctors", (req, res) => {
    try {
      const doctors = db.getUsers()
        .filter(u => u.role === 'doctor')
        .map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          specialization: u.specialization || 'General Practitioner',
          experience: u.experience || '8 Years Experience',
          availability: u.availability || 'Mon-Fri 9:00 AM - 5:00 PM',
        }));
      res.json(doctors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Socket.IO event handler
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Send immediate local state sync
    socket.emit("sync", {
      patients: db.getPatients(),
      settings: db.getSettings(),
      analytics: db.getAnalytics()
    });

    socket.on("request_sync", () => {
      socket.emit("sync", {
        patients: db.getPatients(),
        settings: db.getSettings(),
        analytics: db.getAnalytics()
      });
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Helper function to broadcast state sync across all clients on mutation
  const broadcastSync = () => {
    const syncData = {
      patients: db.getPatients(),
      settings: db.getSettings(),
      analytics: db.getAnalytics()
    };
    io.emit("sync", syncData);
  };

  // REST API: GET /patients
  app.get("/api/patients", (req, res) => {
    try {
      res.json(db.getPatients());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: GET /medical-records
  app.get("/api/medical-records", (req, res) => {
    try {
      const { patientId, patientName } = req.query;
      res.json(db.getMedicalRecords(patientId as string, patientName as string));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST /medical-records
  app.post("/api/medical-records", (req, res) => {
    try {
      const { 
        patientId, 
        patientName, 
        doctorId, 
        doctorName, 
        date, 
        symptoms, 
        diagnosis, 
        notes, 
        followUpDate, 
        medicines 
      } = req.body;
      if (!patientId || !doctorId || !diagnosis) {
        return res.status(400).json({ error: "patientId, doctorId, and diagnosis are required" });
      }
      const record = db.addMedicalRecord({
        patientId,
        patientName: patientName || "Guest Patient",
        doctorId,
        doctorName: doctorName || "Practitioner",
        date: date || new Date().toLocaleDateString('en-GB'),
        symptoms: symptoms || "",
        diagnosis,
        notes: notes || "",
        followUpDate,
        medicines: medicines || []
      });
      broadcastSync();
      res.status(211).json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: GET /api/consultation-reports/:tokenNumber
  app.get("/api/consultation-reports/:tokenNumber", (req, res) => {
    try {
      const { tokenNumber } = req.params;
      const report = db.getConsultationReport(tokenNumber);
      if (!report) {
         return res.status(404).json({ error: `Consultation report with token ${tokenNumber} not found.` });
      }
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST /api/consultation-reports
  app.post("/api/consultation-reports", (req, res) => {
    try {
      const report = db.addConsultationReport(req.body);
      broadcastSync();
      res.status(201).json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST /patients
  app.post("/api/patients", (req, res) => {
    try {
      const { name, isEmergency, doctorName, appointmentDate, appointmentTime, phone, age, gender, patientId, problemDescription } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Patient name is required" });
      }
      const newPatient = db.addPatient({ 
        name, 
        isEmergency, 
        doctorName, 
        appointmentDate, 
        appointmentTime, 
        phone, 
        age: age ? Number(age) : undefined, 
        gender, 
        patientId,
        problemDescription
      });
      broadcastSync();
      res.status(201).json(newPatient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: PUT /call-next
  app.put("/api/call-next", (req, res) => {
    try {
      const { nextPatient, currentToken, previousPatient } = db.callNextPatient();
      broadcastSync();
      res.json({ nextPatient, currentToken, previousPatient });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: PUT /api/patients/:id
  app.put("/api/patients/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, isEmergency, doctorName, age, gender, phone, problemDescription } = req.body;
      const updated = db.editPatient(id, { name, isEmergency, doctorName, age: age ? Number(age) : undefined, gender, phone, problemDescription });
      if (!updated) {
        return res.status(404).json({ error: "Patient not found" });
      }
      broadcastSync();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: DELETE /patients/:id
  app.delete("/api/patients/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { success, promotedPatient } = db.deletePatient(id);
      if (!success) {
        return res.status(404).json({ error: "Patient not found" });
      }
      broadcastSync();
      res.json({ success: true, message: "Patient removed from queue", promotedPatient });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: PUT /patients/:id/status
  app.put("/api/patients/:id/status", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['waiting', 'called', 'completed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      const updatedPatient = db.updatePatientStatus(id, status);
      if (!updatedPatient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      broadcastSync();

      // Send completed SMS
      if (status === 'completed' && updatedPatient.phone) {
        sendSMS(updatedPatient.phone, "Your appointment has been completed. Thank you for visiting Queue Cure.").catch(e => {
          console.error("SMS notification failure on patient status complete:", e);
        });
      }

      res.json(updatedPatient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: PUT /patients/:id/reschedule
  app.put("/api/patients/:id/reschedule", (req, res) => {
    try {
      const { id } = req.params;
      const { appointmentDate, appointmentTime } = req.body;

      if (!appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: "Appointment date and time are required" });
      }

      const patient = db.getPatients().find(p => p._id === id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Check slot duplication
      if (patient.doctorId && db.isSlotBooked(patient.doctorId, appointmentDate, appointmentTime)) {
        return res.status(400).json({ error: "The selected time slot is already booked for this doctor. Please choose a different date or time." });
      }

      const updatedPatient = db.reschedulePatient(id, appointmentDate, appointmentTime);
      if (!updatedPatient) {
        return res.status(500).json({ error: "Failed to reschedule patient record" });
      }

      broadcastSync();

      // Trigger Reschedule SMS notification
      if (updatedPatient.phone) {
        const docNameClean = updatedPatient.doctorName || "your physician";
        const rescheduleSMS = `Your appointment with ${docNameClean} has been rescheduled to ${appointmentTime}.`;
        
        sendSMS(updatedPatient.phone, rescheduleSMS).catch(e => {
          console.error("SMS Rescheduling notification failed:", e);
        });
      }

      res.json(updatedPatient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: GET /settings
  app.get("/api/settings", (req, res) => {
    try {
      res.json(db.getSettings());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST /settings (Updates settings, e.g. average consultation time)
  app.post("/api/settings", (req, res) => {
    try {
      const { consultationTime, currentToken } = req.body;
      const updates: any = {};
      if (typeof consultationTime === "number") updates.consultationTime = consultationTime;
      if (typeof currentToken === "number") updates.currentToken = currentToken;

      const updatedSettings = db.updateSettings(updates);
      broadcastSync();
      res.json(updatedSettings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: GET /analytics
  app.get("/api/analytics", (req, res) => {
    try {
      res.json(db.getAnalytics());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST /reset
  app.post("/api/reset", (req, res) => {
    try {
      const resetResult = db.resetQueue();
      broadcastSync();
      res.json({ message: "Queue database successfully reset", ...resetResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware integration for live browser updates and static bundling
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Queue Cure is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server failure on boot:", err);
});
