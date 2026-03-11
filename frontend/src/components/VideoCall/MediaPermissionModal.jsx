import { VideoOff, RefreshCw, X } from 'lucide-react';

// Detect browser / OS once (not reactive — that's fine)
const ua = navigator.userAgent;
const isIOS     = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
const isAndroid = /Android/.test(ua);
const isSafari  = !isAndroid && /^((?!chrome|android).)*safari/i.test(ua);
const isFirefox = /Firefox/.test(ua);
// Chrome covers Chromium-based browsers (Edge, Opera, Android Chrome)

function getInstructions() {
  if (isIOS) {
    return {
      browser: 'Safari on iOS / iPadOS',
      steps: [
        'Open the \u2060Settings\u2060 app on your device',
        'Scroll down and tap \u2060Safari\u2060',
        'Under \u201cSettings for Websites\u201d tap \u2060Camera\u2060 \u2192 set to \u2060Allow\u2060',
        'Go back, then tap \u2060Microphone\u2060 \u2192 set to \u2060Allow\u2060',
        'Return to this page and tap \u2060Try Again\u2060',
      ],
    };
  }
  if (isSafari) {
    return {
      browser: 'Safari on macOS',
      steps: [
        'In the menu bar open \u2060Safari \u2192 Settings \u2192 Websites\u2060',
        'Select \u2060Camera\u2060 in the sidebar \u2192 set this site to \u2060Allow\u2060',
        'Select \u2060Microphone\u2060 in the sidebar \u2192 set this site to \u2060Allow\u2060',
        'Tap \u2060Try Again\u2060',
      ],
    };
  }
  if (isFirefox) {
    return {
      browser: 'Firefox',
      steps: [
        'Click the \u2060lock icon\u2060 (\uD83D\uDD12) in the address bar',
        'Click \u2060More Information\u2060 \u2192 open the \u2060Permissions\u2060 tab',
        'Set \u2060Use the Camera\u2060 and \u2060Use the Microphone\u2060 to \u2060Allow\u2060',
        'Tap \u2060Try Again\u2060',
      ],
    };
  }
  if (isAndroid) {
    return {
      browser: 'Chrome on Android',
      steps: [
        'Tap the \u2060lock icon\u2060 in the address bar',
        'Tap \u2060Permissions\u2060',
        'Set \u2060Camera\u2060 and \u2060Microphone\u2060 to \u2060Allow\u2060',
        'Tap \u2060Try Again\u2060',
      ],
    };
  }
  // Chrome / Edge / Chromium desktop
  return {
    browser: 'Chrome / Edge',
    steps: [
      'Click the \u2060lock icon\u2060 (\uD83D\uDD12) in the address bar',
      'Set \u2060Camera\u2060 and \u2060Microphone\u2060 to \u2060Allow\u2060',
      'If a reload bar appears, reload the page',
      'Tap \u2060Try Again\u2060',
    ],
  };
}

export default function MediaPermissionModal({ onDismiss, onRetry, callerName }) {
  const { browser, steps } = getInstructions();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      style={{ zIndex: 3000000000 }}
    >
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <VideoOff size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                Camera &amp; Microphone Required
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{browser}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-gray-400 text-sm leading-relaxed">
            {callerName
              ? <>Access was denied. Grant permission then ask <span className="text-white font-medium">{callerName}</span> to call you again.</>
              : 'Access was denied. Follow the steps below then tap Try Again.'}
          </p>

          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-300 text-sm leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onDismiss}
            className="flex-1 h-10 rounded-xl text-sm font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Dismiss
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 h-10 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
