import { useEffect, useRef } from 'react';

/**
 * A hook that listens for rapid keyboard input characteristic of hardware barcode scanners.
 * 
 * Hardware scanners act as keyboards that type characters very quickly and usually
 * terminate the string with an "Enter" key press.
 * 
 * @param {Function} onScan - Callback when a scan completes. Receives the scanned string.
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Max time (ms) between keystrokes to be considered a scan. Default: 50
 * @param {boolean} options.preventDefault - Whether to prevent default browser behavior for scanned keys. Default: true
 * @param {number} options.minLength - Minimum length of a valid scan. Default: 3
 */
const useBarcodeScanner = (onScan, options = {}) => {
  const { timeout = 50, preventDefault = true, minLength = 3 } = options;
  
  const bufferRef = useRef('');
  const timeoutIdRef = useRef(null);
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore key events if the user is typing into an input/textarea
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable)
      ) {
        return;
      }

      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      const currentTime = Date.now();
      const timeElapsed = currentTime - lastKeyTimeRef.current;

      // If too much time has passed since the last key, reset the buffer
      if (timeElapsed > timeout && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      lastKeyTimeRef.current = currentTime;

      // If the Enter key is pressed, evaluate the buffer
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          if (preventDefault) e.preventDefault();
          onScan(bufferRef.current);
        }
        bufferRef.current = '';
        return;
      }

      // Append printable characters to the buffer
      if (e.key.length === 1) {
        if (preventDefault && bufferRef.current.length > 0) {
          e.preventDefault();
        }
        bufferRef.current += e.key;

        // Set a trailing timeout to clear the buffer if "Enter" never comes
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, timeout * 2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [onScan, timeout, preventDefault, minLength]);
};

export default useBarcodeScanner;
