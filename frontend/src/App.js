import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { storage } from './utils/storage';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Standards from './pages/Standards';
import Hazards from './pages/Hazards';
import Samples from './pages/Samples';
import Models from './pages/Models';
import Prompts from './pages/Prompts';
import Inference from './pages/Inference';
import Tasks from './pages/Tasks';
import RAG from './pages/RAG';
import ExportPage from './pages/Export';
import Settings from './pages/Settings';

const RequireAuth = ({ children }) => {
  const token = storage.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="standards" element={<Standards />} />
          <Route path="hazards" element={<Hazards />} />
          <Route path="samples" element={<Samples />} />
          <Route path="models" element={<Models />} />
          <Route path="prompts" element={<Prompts />} />
          <Route path="inference" element={<Inference />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="rag" element={<RAG />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
