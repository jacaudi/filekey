import { Button, List, Spin, Tag, Typography } from 'antd';
import { jobStatusLabel, type FileJob } from '../files/ops';
import { saveJob } from '../files/save';
import { ShareFileAction } from '../share/ShareFileAction';

const NEXT_STEP: Record<string, string> = {
  'wrong passkey/key': 'Check you authenticated with the passkey this file was encrypted for.',
  'not a FileKey file': 'This file is not in the FileKey format — check the file extension.',
  'encryption failed': 'Please try again.',
};

function statusTag(job: FileJob) {
  const label = jobStatusLabel(job);
  switch (job.status) {
    case 'processing':
      return <Tag>{label}</Tag>;
    case 'done':
      return <Tag color={job.kind === 'plain' ? 'blue' : 'green'}>{label}</Tag>;
    case 'error':
      return <Tag color="red">{label}</Tag>;
  }
}

export function FileList({ jobs }: { jobs: FileJob[] }) {
  if (jobs.length === 0) return null;
  const doneJobs = jobs.filter((j) => j.status === 'done');
  const failed = jobs.filter((j) => j.status === 'error').length;

  return (
    <div>
      <Typography.Text type="secondary" aria-live="polite">
        {jobs.length} files · {doneJobs.length} done · {failed} failed
      </Typography.Text>
      {doneJobs.length > 1 && (
        <Button size="small" style={{ marginLeft: 12 }} onClick={() => doneJobs.forEach(saveJob)}>
          Save all
        </Button>
      )}
      <List
        dataSource={jobs}
        rowKey={(j) => j.id}
        renderItem={(job) => (
          // Deliberate divergence from the task brief's sample code: antd v6's
          // List.Item `actions` prop wraps each action in its own <li>, which
          // testing-library treats as an extra `listitem` role and breaks
          // per-row indexing. Rendering the Save button as a plain child keeps
          // one <li> per job (matching the brief's own test expectations).
          <List.Item>
            <List.Item.Meta
              avatar={job.status === 'processing' ? <Spin size="small" /> : undefined}
              title={job.status === 'done' ? job.outName : job.name}
              description={
                job.status === 'error' ? (
                  <>
                    {job.error}
                    {job.error && NEXT_STEP[job.error] ? ` — ${NEXT_STEP[job.error]}` : ''}
                  </>
                ) : undefined
              }
            />
            {job.status === 'done' && job.data !== undefined && (
              <ShareFileAction key="share" job={job} />
            )}
            {job.status === 'done' && (
              <Button type="primary" size="small" onClick={() => saveJob(job)}>
                Save
              </Button>
            )}
            {statusTag(job)}
          </List.Item>
        )}
      />
    </div>
  );
}
