// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App';

describe('scaffold', () => {
  it('renders the antd-based placeholder', () => {
    render(<App />);
    expect(screen.getByTestId('scaffold-placeholder')).toBeTruthy();
  });
});
