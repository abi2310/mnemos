import { render, screen } from '@testing-library/react';
import App from './App';

test('rendert die Hauptüberschrift der App', () => {
  render(<App />);

  const heading = screen.getByRole('heading', {
    name: /upload data/i,
    level: 1,
  });

  expect(heading).toBeInTheDocument();
});