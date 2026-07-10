import { useEffect, useRef, useState } from 'react'

export interface AnnouncerJob {
  id: string
  name: string
  status: string
}

/**
 * Visually-hidden aria-live region announcing file job status changes to
 * screen readers (FileCard status Tags are visual-only; antd message/
 * notification announce their own content, this covers the card text).
 */
export function StatusAnnouncer({ jobs }: { jobs: AnnouncerJob[] }) {
  const previous = useRef<Map<string, string>>(new Map())
  const [message, setMessage] = useState('')

  useEffect(() => {
    for (const job of jobs) {
      if (previous.current.get(job.id) !== job.status) {
        setMessage(`${job.name}: ${job.status}`)
      }
    }
    previous.current = new Map(jobs.map((j) => [j.id, j.status]))
  }, [jobs])

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  )
}
