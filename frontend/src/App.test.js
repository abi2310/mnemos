import { render, screen } from '@testing-library/react';
import App from './App';

test('rendert die App ohne Fehler', () => {
  render(<App />);
  
  // Prüfe, dass die Hauptcontainer gerendert werden
  const mainElement = screen.getByRole('main');
  expect(mainElement).toBeInTheDocument();
});