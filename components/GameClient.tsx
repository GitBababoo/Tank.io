"use client";

import React, { useEffect, useState } from 'react';
// Import the existing Game component
import { Game } from './Game';

export default function GameClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a loading state or nothing during SSR
    return (
        <div className="flex items-center justify-center w-full h-screen bg-slate-950 text-cyan-500 font-mono">
            INITIALIZING NEURAL LINK...
        </div>
    );
  }

  return (
    <div className="w-full h-full absolute inset-0">
        <Game />
    </div>
  );
}