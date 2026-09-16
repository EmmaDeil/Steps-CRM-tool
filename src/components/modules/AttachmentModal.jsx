import React, { useState } from 'react';
import api from '../../services/api';
import { Paperclip, Upload, FileText, X, Download, Trash2 } from 'lucide-react';

const AttachmentModal = ({ isOpen, onClose, entityType, entityId, attachments = [], onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', description);

      await api.post(`/api/workflow/${entityType}/${entityId}/attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSelectedFile(null);
      setDescription('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload attachment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <div className="flex items-center gap-2 text-indigo-600">
            <Paperclip size={22} />
            <h2 className="text-xl font-bold">Document Attachments</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">
            <X size={20} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="mb-6 p-4 bg-gray-50 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
            <Upload size={16} /> Attach New File
          </h3>
          <div>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Description / File notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md p-2 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full py-2 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload Attachment'}
          </button>
        </form>

        {/* Attachment List */}
        <div>
          <h3 className="font-semibold text-sm text-gray-800 mb-3">Attached Documents ({attachments.length})</h3>
          {attachments.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No files attached to this document yet.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg text-xs">
                  <div className="flex items-center gap-3">
                    <FileText className="text-indigo-500" size={20} />
                    <div>
                      <p className="font-semibold text-gray-800">{att.fileName}</p>
                      <p className="text-gray-500 text-[10px]">{att.description || 'Attachment'} • {new Date(att.uploadedAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {att.fileData && (
                    <a
                      href={`data:${att.fileType || 'application/octet-stream'};base64,${att.fileData}`}
                      download={att.fileName}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Download"
                    >
                      <Download size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentModal;
