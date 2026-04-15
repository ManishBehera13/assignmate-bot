import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users as UsersIcon, Search, ShieldCheck, Mail, Phone, Calendar, IndianRupee, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Fetching from the user_stats view we created in SQL
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery) ||
    user.telegram_id?.includes(searchQuery)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
            <UsersIcon className="w-6 h-6 mr-2 text-indigo-600" />
            User Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage registered telegram users and track their spending.</p>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone or ID..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Orders</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Spent</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Joined On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-6 py-8 h-20 bg-slate-50/10"></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mr-3 shadow-sm">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 flex items-center">
                            {user.name}
                            <ShieldCheck className="w-3.5 h-3.5 ml-1.5 text-blue-500" />
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {user.telegram_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-col space-y-1">
                        <span className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {user.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <ShoppingBag className="w-3 h-3 mr-1" />
                        {user.total_orders}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-slate-800 flex items-center justify-end">
                        <IndianRupee className="w-3.5 h-3.5 mr-0.5 text-slate-400" />
                        {user.total_spent.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-400">
                      <div className="flex items-center justify-end">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <UsersIcon className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No users found</p>
                      <p className="text-slate-400 text-xs mt-1">Try adjusting your search query</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersView;

