import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Check, X, Filter, ImageIcon, ExternalLink, FileText } from 'lucide-react';
import clsx from 'clsx';
import ImageModal from './ImageModal';

const OrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, verified, rejected
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('assignments-table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new, ...prev]);
            toast('New verification request arrived!', { icon: '🔔' });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, []);

  const handleUpdateStatus = async (id, newPaymentStatus, newOrderStatus) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ 
          payment_status: newPaymentStatus,
          order_status: newOrderStatus
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Assignment ${newPaymentStatus} successfully`);
      
      // Update local state is handled by Realtime, but for better UX:
      setOrders(prev => prev.map(o => 
        o.id === id 
          ? { ...o, payment_status: newPaymentStatus, order_status: newOrderStatus } 
          : o
      ));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const openModal = (url) => {
    setSelectedImage(url);
    setModalOpen(true);
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.payment_status === filter);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">Loading assignments...</div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50/50">
        <Filter className="w-4 h-4 text-slate-400 mr-2" />
        {['all', 'pending', 'verified', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors",
              filter === f 
                ? "bg-slate-800 text-white" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">Assignment Details</th>
              <th className="px-6 py-4 text-center">User ID</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4 text-center">Assignment File</th>
              <th className="px-6 py-4 text-center">Payment Proof</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                  No assignments found.
                </td>
              </tr>
            ) : filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                {/* Assignment Details */}
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 flex items-center">
                      #{order.id.slice(0, 8)} 
                      <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-500 uppercase">{order.service_type}</span>
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                </td>

                {/* User ID */}
                <td className="px-6 py-4 text-center">
                   <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block">
                     {order.user_id}
                   </span>
                </td>

                {/* Price */}
                <td className="px-6 py-4">
                  <span className="font-semibold text-slate-800">
                    ₹{order.price}
                  </span>
                </td>

                {/* Assignment File Column */}
                <td className="px-6 py-4 text-center">
                  {order.file_url ? (
                    <a 
                      href={order.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all text-blue-600 shadow-sm"
                      title="View/Download File"
                    >
                      <FileText className="w-5 h-5 mr-1" />
                      <span className="text-xs font-medium uppercase">View</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No File</span>
                  )}
                </td>

                {/* Payment Proof */}
                <td className="px-6 py-4 text-center">
                  {order.payment_screenshot_url ? (
                    <button 
                      onClick={() => openModal(order.payment_screenshot_url)}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all group-hover:shadow-sm"
                      title="View Screenshot Preview"
                    >
                      <img 
                        src={order.payment_screenshot_url} 
                        alt="Screenshot" 
                        className="w-10 h-10 object-cover rounded shadow-sm mr-2 border border-slate-100" 
                      />
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                      <ImageIcon className="w-3 h-3 mr-1" /> No Proof
                    </span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-2">
                    <span className={clsx(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-max",
                      order.payment_status === 'verified' && "bg-emerald-100 text-emerald-800",
                      order.payment_status === 'rejected' && "bg-rose-100 text-rose-800",
                      order.payment_status === 'pending' && "bg-amber-100 text-amber-800",
                    )}>
                      {order.payment_status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                      Order: {order.order_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  {order.payment_status === 'pending' ? (
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'verified', 'in_progress')}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-emerald-200"
                        title="Approve Assignment"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'rejected', 'payment_failed')}
                        className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors border border-rose-200"
                        title="Reject Assignment"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Verified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ImageModal 
        isOpen={modalOpen} 
        imageSrc={selectedImage} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
};

export default OrdersTable;

