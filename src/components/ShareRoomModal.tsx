import { type FC, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomKey: string;
}

const ShareRoomModal: FC<ShareRoomModalProps> = ({
  isOpen,
  onClose,
  roomKey,
}) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  if (!isOpen) return null;
  
  const shareableUrl = `${window.location.origin}/?join=${roomKey}`;
  
  const handleCopy = () => {
    if (inputRef.current) {
      inputRef.current.select();
      navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/10 dark:bg-black/30">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Share Room</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Close share modal</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
              Share this link with your team:
            </p>
            <div className="flex">
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">Or scan this QR code:</p>
            <div className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
              <QRCodeSVG value={shareableUrl} size={200} />
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            Anyone with this link can join this planning room.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareRoomModal; 