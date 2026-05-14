"use client";

import { useState } from "react";

export default function AirlineLogo({ iata, name, className = "w-8 h-8" }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`${className} rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-mono font-bold text-xs shrink-0`}>
        {iata}
      </span>
    );
  }

  return (
    <img
      src={`https://pics.avs.io/64/64/${iata}.png`}
      alt={name}
      onError={() => setFailed(true)}
      className={`${className} rounded-full object-contain bg-white border border-slate-100 shrink-0`}
    />
  );
}
