import React from 'react';

export const SakidoLogo: React.FC<{ size?: string; showText?: boolean; textClassName?: string }> = ({
  size = "w-6 h-6",
  showText = false,
  textClassName = "font-display font-bold tracking-tight text-on-surface text-xl",
}) => {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className={`rounded-xl border border-outline-variant/30 shadow-2xs overflow-hidden shrink-0 ${size}`}>
        <img
          src="/logos/main logo sakido.jpeg"
          alt="Sakido Logo"
          className="w-full h-full object-cover"
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
