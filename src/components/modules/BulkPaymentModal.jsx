import React, { useState } from 'react';
import api from '../../services/api';
import { CreditCard, CheckCircle, AlertCircle, X, DollarSign } from 'lucide-react';

const BulkPaymentModal = ({ isOpen, onClose, pos = [], onSuccess }) => {
  const [selectedPOs, setSelectedPOs] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const eligiblePOs = pos.filter((po) => po.status !== 'paid');

  const handleTogglePO = (poId, defaultAmount) => {
    setSelectedPOs((prev) => {
      const next = { ...prev };
      if (next[poId]) {
        delete next[poId];
      } else {
        next[poId] = { poId, amount: defaultAmount, paymentType: 'full', paymentMethod };
      }
      return next;
    });
  };

  const handleAmountChange = (poId, amount) => {
    setSelectedPOs((prev) => ({
      ...prev,
      [poId]: { ...prev[poId], amount: parseFloat(amount) || 0 },
    }));
  };

  const totalPaymentAmount = Object.values(selectedPOs).reduce((acc, item) => acc + (item.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paymentsList = Object.values(selectedPOs);
    if (paymentsList.length === 0) {
      setError('Please select at least one Purchase Order to pay.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post('/api/workflow/pos/bulk-payment', {
        payments: paymentsList.map((p) => ({ ...p, paymentMethod })),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process bulk payments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <div className="flex items-center gap-2 text-green-700">
            <CreditCard size={24} />
            <h2 className="text-xl font-bold">Bulk Payment Processing</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
            <X size={20} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-green-500"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Unpaid Purchase Orders</label>
            {eligiblePOs.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No pending Purchase Orders eligible for payment.</p>
            ) : (
              <div className="space-y-2 border rounded-lg p-3 max-h-60 overflow-y-auto">
                {eligiblePOs.map((po) => {
                  const isSelected = !!selectedPOs[po.id || po._id];
                  const remaining = (po.totalAmount || 0) - (po.paidAmount || 0);
                  return (
                    <div key={po.id || po._id} className={`p-3 rounded-lg border flex items-center justify-between ${isSelected ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePO(po.id || po._id, remaining)}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{po.poNumber}</p>
                          <p className="text-xs text-gray-500">Vendor: {po.vendor} • Due: ₦{remaining.toLocaleString()}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-36">
                          <input
                            type="number"
                            value={selectedPOs[po.id || po._id]?.amount || ''}
                            onChange={(e) => handleAmountChange(po.id || po._id, e.target.value)}
                            placeholder="Amount"
                            className="w-full text-right border rounded p-1 text-sm font-semibold"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center text-sm font-bold text-gray-800">
            <span>Total Selected Payment:</span>
            <span className="text-lg text-green-700">₦{totalPaymentAmount.toLocaleString()}</span>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Object.keys(selectedPOs).length === 0}
              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-bold flex items-center gap-2"
            >
              {loading ? 'Processing...' : 'Execute Bulk Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkPaymentModal;
