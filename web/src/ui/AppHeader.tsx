import { LockOutlined, MenuOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button, Drawer, Dropdown, Grid, Menu, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTheme } from '../theme';
import type { DocKey } from './content';

export type AppHeaderProps = {
  locked: boolean;
  onLock: () => void;
  onReset: () => void;
  onOpenDoc: (key: DocKey) => void;
  version: string;
};

const REPO = 'https://github.com/jacaudi/filekey';

export function AppHeader({ locked, onLock, onReset, onOpenDoc, version }: AppHeaderProps) {
  const { mode, toggle } = useTheme();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = [
    { key: 'reset', label: 'Reset' },
    { type: 'divider' as const },
    { key: 'howItWorks', label: 'How it Works' },
    { key: 'terms', label: 'Terms' },
    { key: 'privacy', label: 'Privacy' },
    {
      key: 'source',
      label: (
        <a href={REPO} target="_blank" rel="noreferrer">
          Source Code
        </a>
      ),
    },
    {
      key: 'license',
      label: (
        <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
          License
        </a>
      ),
    },
    { type: 'divider' as const },
    { key: 'version', label: version, disabled: true },
  ];

  function handleMenuClick({ key }: { key: string }) {
    setDrawerOpen(false);
    if (key === 'reset') onReset();
    else if (key === 'howItWorks' || key === 'terms' || key === 'privacy') onOpenDoc(key);
  }

  return (
    <header
      className="fk-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Space>
        <img src="/logo.svg" alt="" width={24} height={24} />
        <Typography.Text strong>FileKey</Typography.Text>
      </Space>
      <span style={{ flex: 1 }} />
      <Tag icon={locked ? <LockOutlined /> : undefined} color={locked ? 'default' : 'green'}>
        {locked ? 'Locked' : 'Unlocked'}
      </Tag>
      {!locked && (
        <Button size="small" onClick={onLock}>
          Lock
        </Button>
      )}
      <Button
        type="text"
        aria-label="Toggle dark mode"
        aria-pressed={mode === 'dark'}
        icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggle}
      />
      {screens.md ? (
        <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']}>
          <Button type="text" aria-label="Open menu" icon={<MenuOutlined />} />
        </Dropdown>
      ) : (
        <>
          <Button
            type="text"
            aria-label="Open menu"
            icon={<MenuOutlined />}
            onClick={() => setDrawerOpen(true)}
          />
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} placement="right">
            <Menu items={items} onClick={handleMenuClick} selectable={false} mode="inline" />
          </Drawer>
        </>
      )}
    </header>
  );
}
