import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp';
import '../ui/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root mancante');

createRoot(root).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
);
