import {
  LockOutlined,
  MenuOutlined,
  MoonOutlined,
  SunOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Dropdown, Grid, Menu, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTheme } from '../theme';
import { MyShareKeyButton } from '../share/ShareCenter';
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
    // Destructive action (wipes session + files + saved recipients): kept last and
    // danger-styled so it isn't the first thing the pointer lands on.
    { key: 'reset', label: 'Reset', danger: true },
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
        flexWrap: 'wrap',
        gap: screens.md ? 12 : 8,
      }}
    >
      <Space style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
        <img src="/logo.svg" alt="" width={24} height={24} />
        <Typography.Text strong>FileKey</Typography.Text>
      </Space>
      <span style={{ flex: 1 }} />
      {/* Icon-only on narrow screens (the icon + green tint carry the state) so the
          action cluster stays on one row; full label on desktop. */}
      <Tag
        icon={locked ? <LockOutlined /> : <UnlockOutlined />}
        color={locked ? 'default' : 'green'}
        aria-label={locked ? 'Locked' : 'Unlocked'}
        style={screens.md ? undefined : { marginInlineEnd: 0 }}
      >
        {screens.md ? (locked ? 'Locked' : 'Unlocked') : null}
      </Tag>
      {!locked && (
        <Button size="small" onClick={onLock}>
          Lock
        </Button>
      )}
      <MyShareKeyButton />
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
