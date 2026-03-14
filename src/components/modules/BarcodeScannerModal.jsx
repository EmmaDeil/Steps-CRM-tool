import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScannerModal = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    // Create scanner instance
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear(); // Stop scanning once successfully scanned
        onScan(decodedText);
      },
      (err) => {
        // Ignore normal scan errors (like "no QR code found in the current frame")
        // But we could log it or set state if it's a critical camera error
      }
    );

    // Cleanup on unmount or close
    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-camera text-blue-600"></i> Scan Barcode / QR
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        <div className="p-4" style={{ backgroundColor: 'black' }}>
          <div id="reader" width="100%" className="rounded-lg overflow-hidden"></div>
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-center">
          <p className="text-sm text-gray-600">Point your camera at a barcode or QR code.</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
