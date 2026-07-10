import { App as AntApp, Button } from 'antd';
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const NOTIFICATION_KEY = 'fk-sw-update';

/**
 * Shows a persistent notification when a new service worker is waiting
 * (registerType: 'prompt'). Reload activates it and reloads the page.
 */
export function UpdatePrompt() {
  const { notification } = AntApp.useApp();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    notification.info({
      key: NOTIFICATION_KEY,
      message: 'Update available',
      description: 'A new version of FileKey is ready.',
      duration: 0, // sticky until acted on
      btn: (
        <Button type="primary" size="small" onClick={() => void updateServiceWorker(true)}>
          Reload
        </Button>
      ),
      onClose: () => setNeedRefresh(false),
    });
  }, [needRefresh, notification, setNeedRefresh, updateServiceWorker]);

  return null;
}
