import ReactDOM from 'react-dom/client';
import { DevPreview } from './DevPreview';
import '../styles/global.css';

// Entry for dev-preview.html (dev server only). No StrictMode double-invoke so the
// mock stays simple; production uses main.tsx.
ReactDOM.createRoot(document.getElementById('root')!).render(<DevPreview />);
