import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const SettingsView = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Settings</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <SettingsIcon className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">General Settings</h3>
        <p className="text-slate-500 max-w-sm">
          Configure bot parameters, pricing, and admin notifications here. (Coming Soon)
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
