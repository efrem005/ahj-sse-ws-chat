import Chat from './Chat.js';

console.log('app.js loaded');

const root = document.getElementById('root');
console.log('Root элемент:', root);

if (!root) {
  console.error('Root элемент не найден!');
} else {
  const app = new Chat(root);
  app.init();
}
