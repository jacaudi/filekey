import { Modal } from 'antd';
import ReactMarkdown from 'react-markdown';

export function InfoModal({
  title,
  markdown,
  open,
  onClose,
}: {
  title: string;
  markdown: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={720} destroyOnHidden>
      {/* The Modal chrome title already names the doc; drop the markdown's own top
          heading so the title isn't shown twice. */}
      <ReactMarkdown components={{ h1: () => null }}>{markdown}</ReactMarkdown>
    </Modal>
  );
}
