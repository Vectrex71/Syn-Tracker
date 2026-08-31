/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Coffee, 
  ExternalLink, 
  Copy, 
  Check
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const bmcUrl = 'https://buymeacoffee.com/hj_wuethrich';
  const paypalUrl = 'https://paypal.me/HansjuergWuethrich';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="support-modal-backdrop"
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="support-modal-dialog"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#0c121d] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#090e17]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-mono font-bold text-white leading-tight">
                  Support SYN-Tracker
                </h2>
                <p className="text-[11px] text-slate-400">
                  Support the development of the chiptune workstation
                </p>
              </div>
            </div>

            <button
              id="support-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body - 2 Columns without scrolling */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            {/* Left Column: Direct Links */}
            <div className="flex flex-col justify-between gap-3 bg-[#111824] p-4 rounded-xl border border-slate-800">
              {/* Buy Me a Coffee */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    Buy Me a Coffee
                  </span>
                  <button
                    onClick={() => handleCopy(bmcUrl, 'bmc')}
                    className="text-[11px] font-mono text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedLink === 'bmc' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  id="support-bmc-link-btn"
                  href={bmcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3.5 rounded-lg bg-[#FFDD00] hover:bg-[#ffe433] text-black font-mono font-bold text-xs flex items-center justify-between transition-all shadow cursor-pointer group"
                >
                  <span className="truncate">buymeacoffee.com/hj_wuethrich</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5 opacity-80 group-hover:opacity-100" />
                </a>
              </div>

              <div className="h-px bg-slate-800 w-full" />

              {/* PayPal.Me */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    PayPal Direct
                  </span>
                  <button
                    onClick={() => handleCopy(paypalUrl, 'paypal')}
                    className="text-[11px] font-mono text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedLink === 'paypal' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  id="support-paypal-link-btn"
                  href={paypalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3.5 rounded-lg bg-[#0070BA] hover:bg-[#0086dc] text-white font-mono font-bold text-xs flex items-center justify-between transition-all shadow cursor-pointer group"
                >
                  <span className="truncate">paypal.me/HansjuergWuethrich</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5 opacity-80 group-hover:opacity-100" />
                </a>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                SYN-Tracker is and will remain 100% free. Any support helps with new soundchips &amp; updates!
              </p>
            </div>

            {/* Right Column: Clean Large QR Code with white background and black text */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-300 flex flex-col items-center justify-between text-center shadow-lg">
              <span className="text-xs font-mono font-bold text-slate-900 tracking-tight">
                PayPal QR Code
              </span>

              {/* Large QR Code */}
              <div className="my-1.5 flex items-center justify-center">
                <img 
                  src="/qrcode.png" 
                  alt="PayPal QR Code" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain block select-none"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <span className="text-[11px] text-slate-700 font-mono">
                Scan with smartphone camera or PayPal app
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 bg-[#090e17] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-[11px]">Thank you for your support!</span>
            <button
              onClick={onClose}
              className="px-4 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
