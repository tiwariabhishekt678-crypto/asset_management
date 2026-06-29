// App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/LoginPage/Login';
import SidebarLayout from './components/SidebarPage/SidebarLayout';
import Qrcode from './components/QRPage/Qrcode';
import ProtectedRoute from './components/LoginPage/ProtectedRoute';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/reset-password" element={<Login />} />
       

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qr/:assetId"
          element={
            <Qrcode />
          }
        />
      </Routes>

    </div>
  );
}

export default App;
