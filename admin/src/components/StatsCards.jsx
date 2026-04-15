import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Clock, CheckCircle, XCircle, Banknote } from 'lucide-react';
import clsx from 'clsx';

const StatsCards = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.from('assignments').select('*');
      if (error) throw error;
      
      const counts = {
        total: data.length,
        pending: data.filter(o => o.payment_status === 'pending').length,
        verified: data.filter(o => o.payment_status === 'verified').length,
        rejected: data.filter(o => o.payment_status === 'rejected').length,
        revenue: data.filter(o => o.payment_status === 'verified')
                     .reduce((sum, o) => sum + (Number(o.price) || 0), 0)
      };
      setStats(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('assignments-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, []);

  const cards = [
    { label: 'Total Assignments', value: stats.total, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Verification', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Verified', value: stats.verified, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50' }
  ];

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-28 bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse"></div>)}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center">
            <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center mr-4 shrink-0", card.bg)}>
               <Icon className={clsx("w-6 h-6", card.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500 mb-1 truncate">{card.label}</p>
              <h3 className="text-2xl font-bold text-slate-800 truncate">{card.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;

