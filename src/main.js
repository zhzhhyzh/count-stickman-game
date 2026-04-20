import * as THREE from 'three';
import { Game } from './game.js';

try {
    const game = new Game();
    game.init();
} catch (e) {
    console.error('Game init failed:', e);
    document.body.innerHTML = `<div style="color:white;padding:20px;text-align:center;">
        <h2>Error loading game</h2>
        <p>${e.message}</p>
    </div>`;
}
