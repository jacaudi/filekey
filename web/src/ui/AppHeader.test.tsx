import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';
import { ThemeProvider } from '../theme';

// AppHeader now renders <MyShareKeyButton /> (../share/ShareCenter), which pulls in
// ../state/session → ../crypto/client, whose module scope does `new Worker(...)`;
// jsdom has no Worker. Mock the session hook so AppHeader's own tests stay focused
// on header chrome — Share Center behavior is covered by ShareCenter.test.tsx.
vi.mock('../state/session', () => ({
  useSession: () => ({
    locked: false,
    unlock: vi.fn().mockResolvedValue(true),
    lock: vi.fn(),
    getSharePubHex: vi.fn().mockResolvedValue(null),
  }),
}));
// (Task 8) ShareCenter → RecipientsPane → ./validate also pulls in ../crypto/client
// directly (not just via session), so the session mock above no longer shields this
// suite from the module-scope `new Worker(...)`. Mock the singleton too.
vi.mock('../crypto/client', () => ({ rpc: { call: vi.fn() } }));

function renderHeader(over: Partial<Parameters<typeof AppHeader>[0]> = {}) {
  const props = {
    locked: true,
    onLock: vi.fn(),
    onReset: vi.fn(),
    onOpenDoc: vi.fn(),
    version: '1.2.3',
    ...over,
  };
  render(
    <ThemeProvider>
      <AppHeader {...props} />
    </ThemeProvider>,
  );
  return props;
}

describe('AppHeader', () => {
  it('shows the Locked tag and no Lock button when locked', () => {
    renderHeader({ locked: true });
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Locked')).toBeInTheDocument();
    expect(within(banner).queryByRole('button', { name: /^lock$/i })).toBeNull();
  });

  it('shows the Unlocked tag and a working Lock button when unlocked', () => {
    const { onLock } = renderHeader({ locked: false });
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Unlocked')).toBeInTheDocument();
    fireEvent.click(within(banner).getByRole('button', { name: /^lock$/i }));
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('has a theme toggle', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /toggle dark mode/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('opens the menu and routes item clicks: docs, reset, version visible', () => {
    const { onOpenDoc, onReset } = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const menu = screen.getByRole('dialog'); // mobile Drawer under the test breakpoint

    fireEvent.click(within(menu).getByText('How it Works'));
    expect(onOpenDoc).toHaveBeenCalledWith('howItWorks');

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Reset'));
    expect(onReset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(within(screen.getByRole('dialog')).getByText('1.2.3')).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: /source code/i }),
    ).toHaveAttribute('href', 'https://github.com/jacaudi/filekey');
  });
});
