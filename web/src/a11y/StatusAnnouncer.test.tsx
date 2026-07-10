import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusAnnouncer } from './StatusAnnouncer'

// NOTE: the announcer's `status` prop is a DISPLAY label (what jobStatusLabel()
// produces), not the raw FileJob enum — the App.tsx mount maps 'done'→'Encrypted' etc.
// before passing it in. These fixtures use the display strings on purpose.
describe('StatusAnnouncer', () => {
  it('renders a polite live region', () => {
    render(<StatusAnnouncer jobs={[]} />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
  })

  it('announces a job status change', () => {
    const { rerender } = render(
      <StatusAnnouncer jobs={[{ id: '1', name: 'photo.jpg', status: 'Processing' }]} />,
    )
    rerender(
      <StatusAnnouncer jobs={[{ id: '1', name: 'photo.jpg', status: 'Encrypted' }]} />,
    )
    expect(screen.getByRole('status').textContent).toBe('photo.jpg: Encrypted')
  })

  it('does not re-announce unchanged statuses', () => {
    const jobs = [{ id: '1', name: 'photo.jpg', status: 'Encrypted' }]
    const { rerender } = render(<StatusAnnouncer jobs={jobs} />)
    rerender(<StatusAnnouncer jobs={[...jobs]} />)
    // first render announced it; an identical rerender must not change the text
    expect(screen.getByRole('status').textContent).toBe('photo.jpg: Encrypted')
  })
})
