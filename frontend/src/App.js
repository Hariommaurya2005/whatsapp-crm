import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Reminders from './pages/Reminders';
import Meetings from './pages/Meetings';
import CreateMeeting from './pages/CreateMeeting';
import MeetingDetail from './pages/MeetingDetail';
import EditMeeting from './pages/EditMeeting';
import KnowledgeBase from './pages/KnowledgeBase';
import CreateKnowledge from './pages/CreateKnowledge';
import KnowledgeDetail from './pages/KnowledgeDetail';
import EditKnowledge from './pages/EditKnowledge';
import Chats from './pages/Chats';
import Chat from './pages/Chat';
import UsersManagement from './pages/UsersManagement';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="app-layout">
                <Navbar />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/leads" element={<Leads />} />
                    <Route path="/leads/:id" element={<LeadDetail />} />
                    <Route path="/leads/:leadId/chat" element={<Chat />} />
                    <Route path="/chats" element={<Chats />} />
                    <Route path="/reminders" element={<Reminders />} />
                    <Route path="/meetings" element={<Meetings />} />
                    <Route path="/meetings/new" element={<CreateMeeting />} />
                    <Route path="/meetings/:id/edit" element={<EditMeeting />} />
                    <Route path="/meetings/:id" element={<MeetingDetail />} />
                    <Route path="/knowledge-base" element={<KnowledgeBase />} />
                    <Route path="/knowledge-base/new" element={<CreateKnowledge />} />
                    <Route path="/knowledge-base/:id/edit" element={<EditKnowledge />} />
                    <Route path="/knowledge-base/:id" element={<KnowledgeDetail />} />
                    <Route path="/users" element={<UsersManagement />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover theme="dark" />
    </AuthProvider>
  );
}

export default App;
