import React from 'react';
import { Bell, Search, LogOut } from 'lucide-react';

const Navbar = ({ onLogout }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8">
      <div className="flex items-center text-slate-400">
        <Search className="w-5 h-5 mr-3" />
        <input 
          type="text" 
          placeholder="Search by Order ID or User ID..." 
          className="bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400 w-64"
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-slate-50 text-slate-500 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="h-6 w-px bg-slate-200"></div>
        <button 
          onClick={onLogout}
          className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
