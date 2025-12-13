
import React from 'react';
import { Game } from './components/Game';
import { Providers } from './lib/providers';

function App() {
  return (
    <Providers>
      <div className="w-full h-full">
        <Game />
      </div>
    </Providers>
  );
}

export default App;
