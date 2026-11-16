import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#171716] bg-white border border-[#D8D5CC] hover:border-[#171716] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
      >
        <Download className="w-4 h-4 text-[#B91C1C]" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#171716] bg-white border border-[#D8D5CC] hover:border-[#171716] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Share className="w-4 h-4 text-[#B91C1C]" />
          <span>Install on iPhone</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-[#FAF9F6] border border-[#E5E3DC] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#171716]">
                  Install IBC Bakery App
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="p-1.5 rounded-lg text-[#5C5A55] hover:bg-[#F3F2EE] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-[#46443F] leading-relaxed">
                1. Tap the <strong>Share</strong> button in your Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] py-2.5 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
