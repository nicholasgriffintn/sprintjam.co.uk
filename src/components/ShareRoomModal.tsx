import { type FC, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SurfaceCard } from './ui/SurfaceCard';
import { Button } from './ui/Button';

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
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/10 dark:bg-black/30 backdrop-blur-sm">
      <SurfaceCard className="w-full max-w-md" padding="md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Share Room</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Close share modal</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
              Share this link with your team:
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 rounded-2xl border border-white/50 bg-white/80 px-4 py-2.5 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:ring-brand-900 dark:focus:border-brand-400"
              />
              <Button
                onClick={handleCopy}
                variant="primary"
                size="md"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Or scan this QR code:</p>
            <div className="p-4 bg-white/80 dark:bg-slate-900/60 border border-white/50 dark:border-white/10 rounded-2xl shadow-sm">
              <QRCodeSVG value={shareableUrl} size={200} />
            </div>
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400 italic">
            Anyone with this link can join this planning room.
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
};

export default ShareRoomModal; 