// ==============================================================================
// SmurfDecisions · Router principal
// Rutas públicas: /  →  Landing
//                 /login  →  Login
//                 /registro → Registro
// Rutas protegidas: /dashboard/*  →  Layout + sub-páginas
// ==============================================================================
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';

// Páginas públicas
import Landing from './pages/Landing';
import Login from './pages/Login';
import Registro from './pages/Registro';

// Layout y páginas del dashboard
import Layout from './components/Layout';
import PanelEjecutivo from './pages/PanelEjecutivo';
import NoticiasAnalizadas from './pages/NoticiasAnalizadas';
import AnalisisPestel from './pages/AnalisisPestel';
import Recomendador from './pages/Recomendador';
import SimuladorEconomico from './pages/SimuladorEconomico';
import CentroActualizaciones from './pages/CentroActualizaciones';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── PÁGINAS PÚBLICAS ── */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {/* ── DASHBOARD PROTEGIDO ── */}
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<PanelEjecutivo />} />
            <Route path="noticias" element={<NoticiasAnalizadas />} />
            <Route path="pestel" element={<AnalisisPestel />} />
            <Route path="recomendador" element={<Recomendador />} />
            <Route path="simulador" element={<SimuladorEconomico />} />
            <Route path="actualizaciones" element={<CentroActualizaciones />} />
          </Route>

          {/* ── CATCH-ALL ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
