import React from 'react';
import StatsCards from '../StatsCards';
import RevenueChart from '../RevenueChart';

const DashboardView = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Overview</h1>
      <StatsCards />
      
      <div className="grid grid-cols-1 gap-8">
        <RevenueChart />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center mt-8">
        <h3 className="text-lg font-medium text-slate-800 mb-2">Welcome to the AssignMate Dashboard</h3>
        <p className="text-slate-500">
          From here you can monitor high-level system metrics. Switch to the <strong>Verifications</strong> tab to approve or reject pending requests.
        </p>
      </div>
    </div>
  );
};

export default DashboardView;
