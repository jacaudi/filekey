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
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </Modal>
  );
}
