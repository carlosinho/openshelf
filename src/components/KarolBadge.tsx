"use client"

import { useState, useEffect } from 'react';

/**
 * KarolBadge Component - Version 1.1
 * A floating badge component with avatar and promotional speech bubble
 * Customizable delaySeconds and primaryColor + other stuff
 */

export interface KarolBadgeProps {
  delaySeconds?: number;
  avatarUrl?: string;
  avatarAlt?: string;
  bubbleContent?: React.ReactNode;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showOnlineIndicator?: boolean;
}

export const KarolBadge = ({
  delaySeconds = 20,
  primaryColor = "#166534",
  avatarUrl = "/karol.png",
  avatarAlt = "Karol",
  position = "bottom-right",
  showOnlineIndicator = true,
  bubbleContent = (
    <div>
      <p className="mb-2">
        Hey, have you checked out{' '}
        <a 
          href="https://wpwork.shop/" 
          target="_blank" 
          rel="noopener"
          className="font-medium underline decoration-2 underline-offset-2"
          style={{ color: primaryColor }}
        >
          WP&nbsp;Workshop
        </a>{' '}
        yet?
      </p>
      <p>
        Subscribe on{' '}
        <a 
          href="https://www.youtube.com/@wpworkshophq" 
          target="_blank" 
          rel="noopener"
          className="font-medium underline decoration-2 underline-offset-2"
          style={{ color: primaryColor }}
        >
          YouTube
        </a>{' '}
        and see what else I have going on.
      </p>
    </div>
  )
}: KarolBadgeProps = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleClosed, setBubbleClosed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setTimeout(() => setShowBubble(true), 2000);
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [delaySeconds]);

  if (!isVisible) return null;

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Speech Bubble */}
      {showBubble && !bubbleClosed && (
        <div className="absolute bottom-36 right-0 mb-2 animate-in slide-in-from-bottom-2 duration-500">
          <div className="relative bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
            {/* Close button */}
            <button
              onClick={() => setBubbleClosed(true)}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-sm text-gray-700 leading-relaxed pr-6">
              {bubbleContent}
            </div>
            {/* Speech bubble arrow */}
            <div className="absolute bottom-0 right-6 transform translate-y-full">
              <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
            </div>
          </div>
        </div>
      )}

      {/* Badge with avatar */}
      <div className="relative">
        <img 
          src={avatarUrl}
          alt={avatarAlt}
          className={`
            w-32 h-32 cursor-pointer object-contain hover:scale-110 
            transition-all duration-300 ease-out drop-shadow-lg
            ${isVisible ? 'animate-bounce-in' : ''}
          `}
          style={{
            animation: isVisible ? 'bounceIn 0.8s ease-out, wiggle 0.6s ease-in-out 1.2s' : ''
          }}
        />
        
        {showOnlineIndicator && (
          <div 
            className="absolute -bottom-2 -right-2 w-8 h-8 border-4 border-white rounded-full animate-pulse"
            style={{ backgroundColor: primaryColor }}
          />
        )}
      </div>

      <style>{`
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(50px);
          }
          50% {
            opacity: 1;
            transform: scale(1.1) translateY(-10px);
          }
          70% {
            transform: scale(0.9) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-3deg) scale(1.05);
          }
          75% {
            transform: rotate(3deg) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}; 