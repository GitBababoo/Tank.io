import dynamic from 'next/dynamic';

// Dynamically import the GameClient with SSR disabled
// This is critical because the game engine relies on 'window' and 'canvas' which don't exist on the server.
const GameClient = dynamic(() => import('@/components/GameClient'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-screen bg-black text-cyan-500 font-mono tracking-widest animate-pulse">
        LOADING ENGINE...
    </div>
  )
});

export default function Page() {
  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <GameClient />
    </main>
  );
}