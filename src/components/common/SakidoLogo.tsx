import React from 'react';

interface SakidoLogoProps {
  size?: string;
  showText?: boolean;
  textClassName?: string;
  className?: string;
}

export const SakidoLogo: React.FC<SakidoLogoProps> = ({
  size = "w-7 h-7",
  showText = false,
  textClassName = "font-display font-bold tracking-tight text-on-surface text-xl",
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <div className={`rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${size}`}>
        <img
          src="/logos/main_logo_sakido.png"
          alt="Sakido Logo"
          className="w-full h-full object-contain invert dark:invert-0 contrast-125 transition-all duration-200"
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
