import React, { useState } from 'react';

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
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <div className={`rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${size}`}>
        {!imgError ? (
          <img
            src="/main_logo_sakido.png"
            alt="Sakido Logo"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter invert dark:invert-0 dark:brightness-100 contrast-125 transition-all duration-200"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-primary text-on-primary font-display font-black text-sm flex items-center justify-center shadow-2xs">
            S
          </div>
        )}
      </div>
      {showText && (
        <span className={textClassName}>
          Sakido
        </span>
      )}
    </div>
  );
};
