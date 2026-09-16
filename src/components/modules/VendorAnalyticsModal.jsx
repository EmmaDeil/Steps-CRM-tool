import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Award, TrendingUp, CheckCircle, AlertTriangle, ShieldCheck, X } from 'lucide-react';

const VendorAnalyticsModal = ({ isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/workflow/vendors/analytics');
        setAnalytics(res.data.data || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load vendor analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vendor Performance Analytics</h2>
              <p className="text-sm text-gray-500">Quality scorecards, response rates, and total procurement spend</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        ) : analytics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No vendor procurement data recorded yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analytics.map((vendor, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{vendor.vendorName}</h3>
                    <p className="text-xs text-gray-500">{vendor.totalPOs} Purchase Orders • {vendor.totalRFQs} RFQs</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    vendor.qualityScore >= 90 ? 'bg-green-100 text-green-800' : vendor.qualityScore >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {vendor.qualityScore}% Quality
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Quote Response Rate</span>
                      <span className="font-semibold">{vendor.quoteResponseRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(vendor.quoteResponseRate, 100)}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500 block">Total Spend</span>
                      <span className="font-bold text-gray-900">₦{(vendor.totalSpend || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <span className="text-gray-500 block">Damaged Items</span>
                      <span className={`font-bold ${vendor.itemsDamaged > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {vendor.itemsDamaged} / {vendor.itemsReceived}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorAnalyticsModal;
