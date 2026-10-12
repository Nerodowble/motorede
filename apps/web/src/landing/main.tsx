import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './Landing';
import './landing.css';

// Entrada da página /baixar/ (apps/web/baixar/index.html). Não importa o
// `src/index.css` nem o App: a landing tem o próprio CSS e precisa abrir leve.
createRoot(document.getElementById('landing')!).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
