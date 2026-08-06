import './style.css';
import { Game } from './game';
import { mountShell, bindUI } from './ui';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app not found');

const canvas = mountShell(app);
const game = new Game(canvas);
bindUI(app, game);
game.startLoop();

window.addEventListener('resize', () => game.renderer.resize());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.pause();
});
