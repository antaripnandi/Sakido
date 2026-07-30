import React from 'react';

export const SakidoLogo: React.FC<{ size?: string; showText?: boolean; textClassName?: string }> = ({
  size = "w-6 h-6",
  showText = false,
  textClassName = "font-display font-bold tracking-tight text-on-surface text-xl",
}) => {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className={`rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${size}`}>
        <img
          src="/logos/main_logo_sakido.png"
          alt="Sakido Logo"
          className="w-full h-full object-contain invert dark:invert-0"
        />
      </div>
      {showText && (
        <span className={textClassName}>
          Sakido
        </span>
      )}
    </div>
  );
};
