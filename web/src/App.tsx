import { ConfigProvider, Typography } from 'antd';

export function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1377F9' } }}>
      <Typography.Text data-testid="scaffold-placeholder">
        FileKey web scaffold — no user-facing UI in Phase 1.
      </Typography.Text>
    </ConfigProvider>
  );
}
