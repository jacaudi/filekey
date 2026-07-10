// Single-source docs (design §5.4): the modal bodies ARE the docs files, imported
// at build time — the modal and docs/ cannot drift.
import howItWorks from '../../../docs/how-it-works.md?raw';
import terms from '../../../docs/terms.md?raw';
import privacy from '../../../docs/privacy.md?raw';

export const DOCS = { howItWorks, terms, privacy } as const;
export type DocKey = keyof typeof DOCS;
