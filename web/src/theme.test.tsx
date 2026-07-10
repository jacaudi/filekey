import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appTheme, ThemeProvider, useTheme } from './theme';

function Probe() {
  const { mode, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      mode:{mode}
    </button>
  );
}

describe('appTheme', () => {
  it('sets controlHeightLG to 44 for the design §6/§9 ≥44px touch-target budget', () => {
    expect(appTheme.token?.controlHeightLG).toBe(44);
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
  });

  it('defaults to the system preference (light under the test polyfill)', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('mode:light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('honors a stored fk_theme value', () => {
    localStorage.setItem('fk_theme', 'dark');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('mode:dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle flips the mode, the data-theme attribute, and persists fk_theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('mode:dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('fk_theme')).toBe('dark');
  });
});
