import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PanelEjecutivo from './pages/PanelEjecutivo';
import NoticiasAnalizadas from './pages/NoticiasAnalizadas';
import AnalisisPestel from './pages/AnalisisPestel';
import Recomendador from './pages/Recomendador';
import SimuladorEconomico from './pages/SimuladorEconomico';
import CentroActualizaciones from './pages/CentroActualizaciones';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PanelEjecutivo />} />
          <Route path="noticias" element={<NoticiasAnalizadas />} />
          <Route path="pestel" element={<AnalisisPestel />} />
          <Route path="recomendador" element={<Recomendador />} />
          <Route path="simulador" element={<SimuladorEconomico />} />
          <Route path="actualizaciones" element={<CentroActualizaciones />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
