import React from 'react';

export const SakidoLogo: React.FC<{ size?: string; showText?: boolean; textClassName?: string }> = ({
  size = "w-6 h-6",
  showText = false,
  textClassName = "font-display font-bold tracking-tight text-on-surface text-xl",
}) => {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className={`rounded-full bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900 flex items-center justify-center border border-zinc-700/50 shadow-2xs overflow-hidden shrink-0 ${size}`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[72%] h-[72%] fill-current">
          <path d="M50 10C27.9 10 10 27.9 10 50C10 72.1 27.9 90 50 90C63.6 90 75.5 83.2 82.6 72.8C75.8 77.8 67.2 80.8 58 80.8C37 80.8 20 63.8 20 42.8C20 29.8 26.5 18.3 36.4 11.4C40.6 10.5 45.2 10 50 10Z" />
          <circle cx="65" cy="35" r="12" />
        </svg>
      </div>
      {showText && (
        <span className={textClassName}>
          Sakido
        </span>
      )}
    </div>
  );
};
