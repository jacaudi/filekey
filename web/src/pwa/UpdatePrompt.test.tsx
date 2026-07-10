import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockInitialState, updateServiceWorker } from '../test/mocks/pwa-register-react';
import { UpdatePrompt } from './UpdatePrompt';

function renderPrompt() {
  return render(
    <AntApp>
      <UpdatePrompt />
    </AntApp>,
  );
}

describe('UpdatePrompt', () => {
  beforeEach(() => {
    updateServiceWorker.mockClear();
    mockInitialState.needRefresh = false;
  });

  it('renders nothing when no update is pending', () => {
    renderPrompt();
    expect(screen.queryByText('Update available')).toBeNull();
  });

  it('raises a notification when the SW reports needRefresh', async () => {
    mockInitialState.needRefresh = true;
    renderPrompt();
    expect(await screen.findByText('Update available')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
  });

  it('Reload activates the waiting SW and reloads', async () => {
    mockInitialState.needRefresh = true;
    renderPrompt();
    await userEvent.click(await screen.findByRole('button', { name: 'Reload' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
