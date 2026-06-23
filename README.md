🏥 Queue Cure – Smart Hospital Queue & Appointment Management System
📌 Overview

Queue Cure is a modern hospital queue and appointment management platform designed to streamline patient registration, appointment scheduling, queue tracking, and doctor consultations.

The system eliminates manual queue handling by providing real-time queue updates, token generation, consultation management, analytics dashboards, and digital patient reports.

Built with modern web technologies, Queue Cure improves efficiency for receptionists and doctors while reducing patient waiting time and administrative workload.

🎯 Problem Statement

Many clinics and hospitals still rely on manual token systems and paper-based appointment tracking, leading to:

Long patient waiting times
Queue confusion
Inefficient appointment management
Poor communication between staff and patients
Lack of digital records and analytics

Queue Cure addresses these challenges through an intelligent and centralized healthcare queue management system.

🚀 Key Features
👩‍💼 Receptionist Dashboard
Patient Registration
Automatic Token Generation
Queue Management
Call Next Patient
Edit Patient Details
Delete Patient Records
Emergency Priority Queue
Consultation Time Management
Live Queue Monitoring
👨‍⚕️ Doctor Dashboard
Doctor Authentication
Assigned Patient Queue
Start Consultation
Complete Consultation
Add Diagnosis & Notes
Prescription Management
Follow-up Scheduling
Patient Medical History
📊 Analytics Dashboard
Patients Seen Today
Weekly Patient Trends
Appointment Status Distribution
Average Consultation Time
Queue Statistics
📺 Live Queue Display
Current Token Display
Upcoming Tokens
Waiting Patient Count
Doctor Information
Real-Time Updates using Socket.IO
📄 Digital Consultation Reports
PDF Report Generation
Diagnosis Details
Prescription Information
Doctor Notes
Follow-up Details
🔳 QR Code Reports
Unique QR Code for each report
Instant report retrieval through scanning
Secure report access
📧 Notifications
Appointment Confirmation
Appointment Reminders
Consultation Updates
🛠️ Technology Stack
Frontend
React.js
Tailwind CSS
React Router
Recharts
Axios
Backend
Node.js
Express.js
Database
MongoDB
Mongoose
Authentication
JWT Authentication
bcrypt Password Hashing
Real-Time Communication
Socket.IO
Additional Libraries
QR Code Generator
PDF Generator
Nodemailer
🏗️ System Architecture
Receptionist Dashboard
          │
          ▼
      Express API
          │
          ▼
       MongoDB
          │
          ▼
       Socket.IO
          │
 ┌────────┴────────┐
 ▼                 ▼
Doctor Dashboard   Live Queue Screen
📂 Modules
Authentication Module
Doctor Login
Receptionist Login
Role-Based Access Control
Patient Management Module
Register Patient
Assign Doctor
Generate Token
Manage Queue
Consultation Module
Diagnosis
Prescription
Medical Notes
Follow-up Management
Reporting Module
PDF Generation
QR Code Reports
Report History
Analytics Module
Performance Insights
Queue Analytics
Consultation Statistics
🔐 Security Features
JWT Authentication
Password Hashing
Protected Routes
Role-Based Authorization
Secure Database Storage
📈 Future Enhancements
Multi-Hospital Support
AI Waiting Time Prediction
WhatsApp Notifications
Voice-Based Queue Announcements
Cloud Report Storage
Mobile Application
🎯 Benefits
For Receptionists
Faster Registration
Efficient Queue Management
Reduced Manual Work
For Doctors
Organized Patient Flow
Digital Medical Records
Better Consultation Tracking
For Patients
Reduced Waiting Time
Transparent Queue Status
Easy Access to Reports
👨‍💻 Developed By

Balaji S

Chennai Institute of Technology (CIT)

B.E. Computer Science and Engineering

📜 License

This project is developed for educational, research, and healthcare innovation purposes.
