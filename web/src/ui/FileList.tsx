import { Button, Card, List, Tag, Typography } from 'antd';
import { LoadingOutlined, LockOutlined, ShareAltOutlined, UnlockOutlined } from '@ant-design/icons';
import { jobStatusLabel, type FileJob } from '../files/ops';
import type { FileKind } from '../files/registry';
import { saveJob } from '../files/save';
import { ShareFileAction } from '../share/ShareFileAction';

const NEXT_STEP: Record<string, string> = {
  'wrong passkey/key': 'Check you authenticated with the passkey this file was encrypted for.',
  'not a FileKey file': 'This file is not in the FileKey format — check the file extension.',
  'encryption failed': 'Please try again.',
};

const KIND_ICON: Record<FileKind, JSX.Element> = {
  plain: <LockOutlined />, // input plain → encrypted output
  encrypted: <UnlockOutlined />, // input .filekey → decrypted output
  shared: <ShareAltOutlined />,
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
    <Card title="Your files" size="small">
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
        renderItem={(job) => {
          // Controlled responsive row: [icon · name · status] on the left, actions
          // on the right, wrapping the action cluster below on narrow screens so it
          // never overlaps the filename. One <li> per job (avoid List.Item `actions`,
          // which testing-library counts as extra listitems).
          const name = job.status === 'done' ? job.outName : job.name;
          return (
            <List.Item>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    columnGap: 12,
                    rowGap: 8,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 240px', minWidth: 0 }}
                  >
                    <span style={{ flexShrink: 0, display: 'inline-flex', fontSize: 16 }}>
                      {job.status === 'processing' ? <LoadingOutlined spin /> : KIND_ICON[job.kind]}
                    </span>
                    <Typography.Text strong ellipsis style={{ minWidth: 0 }}>
                      {name}
                    </Typography.Text>
                    {statusTag(job)}
                  </div>
                  {job.status === 'done' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                        marginLeft: 'auto',
                      }}
                    >
                      {job.data !== undefined && <ShareFileAction key="share" job={job} />}
                      <Button type="primary" size="small" onClick={() => saveJob(job)}>
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {job.status === 'error' && job.error && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, paddingLeft: 26 }}>
                    {job.error}
                    {NEXT_STEP[job.error] ? ` — ${NEXT_STEP[job.error]}` : ''}
                  </Typography.Text>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
