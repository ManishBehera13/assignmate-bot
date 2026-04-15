import React from 'react';
import { LayoutDashboard, Users, CreditCard, Settings, BookOpen } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ currentView, setCurrentView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Verifications', icon: CreditCard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col transition-all duration-300">
      <div className="h-16 flex items-center px-6 border-b border-slate-100 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">AssignMate</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={clsx(
                "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm",
                isActive 
                  ? "bg-primary/5 text-primary" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={clsx("w-5 h-5", isActive ? "text-primary" : "text-slate-400")} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-lg p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-200 mb-2"></div>
          <span className="text-sm font-semibold text-slate-800">Admin User</span>
          <span className="text-xs text-slate-500">System Admin</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
