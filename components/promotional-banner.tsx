'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface PromotionalBannerProps {
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  discountPercentage?: number;
  expiresAt?: string;
}

export function PromotionalBanner({
  title,
  message,
  ctaText,
  ctaUrl,
  discountPercentage,
  expiresAt
}: PromotionalBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - Date.now();

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>

        <div className="relative px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap flex-1">
              <div className="flex items-center gap-3">
                {discountPercentage && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    {discountPercentage}% OFF
                  </span>
                )}
                <div>
                  <span className="font-bold text-sm uppercase tracking-wide">{title}</span>
                  <span className="mx-2 hidden sm:inline">•</span>
                  <span className="text-sm block sm:inline">{message}</span>
                </div>
              </div>

              {timeLeft && (
                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <span className="text-xs sm:text-sm font-medium">Ends in:</span>
                  <div className="flex gap-1">
                    {timeLeft.days > 0 && (
                      <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded min-w-[40px] text-center">
                        <div className="text-lg font-bold leading-none">{timeLeft.days}</div>
                        <div className="text-[10px] uppercase">Days</div>
                      </div>
                    )}
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded min-w-[40px] text-center">
                      <div className="text-lg font-bold leading-none">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] uppercase">Hrs</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded min-w-[40px] text-center">
                      <div className="text-lg font-bold leading-none">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] uppercase">Min</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded min-w-[40px] text-center">
                      <div className="text-lg font-bold leading-none">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] uppercase">Sec</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {ctaText && ctaUrl && (
                <Link
                  href={ctaUrl}
                  className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors whitespace-nowrap"
                >
                  {ctaText}
                </Link>
              )}

              <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Close banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
