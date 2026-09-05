import React from 'react';

export const CareerPilotIcon = ({ className = "w-8 h-8", ...props }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="2" y="2" width="28" height="28" rx="8" fill="#16324f" />
    <path d="M 8 22 L 16 8 L 24 22 L 16 18 Z" fill="#ffffff" />
    <path d="M 16 8 L 24 22 L 16 18 Z" fill="#c2410c" />
  </svg>
);

const CareerPilotLogo = ({
  variant = 'full',
  iconOnlyOnMobile = false,
  lightMode = false,
  className = '',
  iconClassName = 'w-8 h-8',
  textSize = 'text-xl',
  ...props
}) => {
  if (variant === 'icon') {
    return (
      <div className={`flex items-center ${className}`} {...props}>
        <CareerPilotIcon className={iconClassName} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`} {...props}>
      <CareerPilotIcon className={iconClassName} />

      <div className={`flex items-baseline ${iconOnlyOnMobile ? 'hidden sm:flex' : 'flex'}`}>
        <span
          className={`font-display font-extrabold tracking-tight ${textSize} ${
            lightMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          CareerPilot
        </span>
        <span
          className={`font-display font-semibold ml-1.5 ${
            lightMode ? 'text-slate-300' : 'text-slate-500'
          } ${textSize === 'text-xl' ? 'text-base' : 'text-sm'}`}
        >
          AI
        </span>
      </div>
    </div>
  );
};

export default CareerPilotLogo;
