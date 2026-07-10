import { InboxOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import { useEffect } from 'react';
import { collectFiles } from '../files/collect';

export function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  // Paste support (design §5.3): clipboard files/screenshots anywhere on the page.
  useEffect(() => {
    function handlePaste(e: Event) {
      const files = (e as ClipboardEvent).clipboardData?.files;
      if (files && files.length > 0) onFiles(Array.from(files));
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onFiles]);

  // Capture-phase drop: our directory-recursing collector owns ALL drops, and
  // stopPropagation keeps rc-upload's internal drop path from double-firing.
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const files = await collectFiles(e.dataTransfer);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      data-testid="fk-dropzone"
      onDropCapture={handleDrop}
      onDragOverCapture={(e) => e.preventDefault()}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <Upload.Dragger
        multiple
        showUploadList={false}
        beforeUpload={(file, fileList) => {
          // beforeUpload fires once per file with the whole batch — emit once.
          if (file === fileList[0]) onFiles(fileList as unknown as File[]);
          return false;
        }}
        style={{ flex: 1 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Drop files anywhere, click to pick, or paste</p>
        <p className="ant-upload-hint">
          Plain files are encrypted; .filekey and .shared_filekey files are decrypted.
        </p>
      </Upload.Dragger>
    </div>
  );
}
