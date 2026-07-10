import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InfoModal } from './InfoModal';
import { DOCS } from './content';

describe('DOCS single-sourcing', () => {
  it('imports the docs/ markdown at build time', () => {
    expect(DOCS.howItWorks).toContain('AES-256');
    expect(DOCS.howItWorks).toContain('P-521');
    expect(DOCS.terms).toContain('Acceptance of Terms');
    expect(DOCS.privacy).toContain('No Data Collection');
  });
});

describe('InfoModal', () => {
  it('renders markdown content inside an antd modal', () => {
    render(
      <InfoModal title="How FileKey Works" markdown={'# Hello\n\nSome **body** text'} open onClose={() => {}} />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
    expect(within(dialog).getByText('body')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<InfoModal title="T" markdown="# Hidden" open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
