import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

const RevenueChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const processData = (orders) => {
    // Last 7 days
    const last7Days = [...Array(7)].map((_, i) => subDays(new Date(), i)).reverse();
    
    return last7Days.map(date => {
      const dayTotal = orders
        .filter(o => o.payment_status === 'verified' && isSameDay(new Date(o.created_at), date))
        .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
      
      return {
        date: format(date, 'MMM dd'),
        revenue: dayTotal
      };
    });
  };

  const fetchData = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('assignments')
        .select('created_at, price, payment_status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(processData(orders || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('revenue-chart-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, []);

  if (loading) return <div className="h-[400px] w-full bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse"></div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Revenue Trend</h2>
          <p className="text-sm text-slate-500">Earnings from verified assignments over the last 7 days</p>
        </div>
      </div>
      
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value) => [`₹${value}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#4f46e5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;

