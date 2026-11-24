// ==============================================================================
// AgroDecisions · Compra de cacao para Coagropacífico
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
import MatrizDrivers from './pages/MatrizDrivers';
import Recomendador from './pages/Recomendador';
import CompraCacao from './pages/CompraCacao';
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
            <Route path="drivers" element={<MatrizDrivers />} />
            <Route path="pestel" element={<Navigate to="/dashboard/drivers" replace />} />
            <Route path="recomendador" element={<Recomendador />} />
            <Route path="simulador" element={<CompraCacao />} />
            <Route path="actualizaciones" element={<CentroActualizaciones />} />
          </Route>

          {/* ── CATCH-ALL ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
