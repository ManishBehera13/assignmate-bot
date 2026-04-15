import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './components/Login';

// Views
import DashboardView from './components/views/DashboardView';
import UsersView from './components/views/UsersView';
import SettingsView from './components/views/SettingsView';
import OrdersTable from './components/OrdersTable';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAdminAuthenticated') === 'true';
  });
  const [currentView, setCurrentView] = useState('dashboard');

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAdminAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAdminAuthenticated');
  };

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'orders':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">Verifications & Work</h2>
            </div>
            <OrdersTable />
          </div>
        );
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-text-main font-sans overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Navbar onLogout={handleLogout} />
        
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-8">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
