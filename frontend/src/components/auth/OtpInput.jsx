import React, { useMemo, useRef } from 'react';

const OtpInput = ({ value, onChange, disabled = false }) => {
  const inputRefs = useRef([]);
  const digits = useMemo(() => Array.from({ length: 6 }, (_, index) => value[index] || ''), [value]);

  const focusIndex = (index) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const updateValue = (index, nextValue) => {
    const nextDigits = [...digits];
    nextDigits[index] = nextValue;
    onChange(nextDigits.join(''));
  };

  const handleChange = (index, event) => {
    const nextDigit = event.target.value.replace(/\D/g, '').slice(-1);
    updateValue(index, nextDigit);
    if (nextDigit && index < 5) {
      focusIndex(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusIndex(index - 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) {
      return;
    }

    onChange(pasted);
    focusIndex(Math.min(pasted.length, 5));
  };

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { inputRefs.current[index] = element; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          disabled={disabled}
          className="h-14 rounded-2xl border border-stone-200 bg-white text-center text-lg font-semibold tracking-[0.3em] text-slate-900 outline-none transition focus:border-[#16324f] focus:ring-4 focus:ring-[#16324f]/8 disabled:cursor-not-allowed disabled:bg-stone-100"
        />
      ))}
    </div>
  );
};

export default OtpInput;