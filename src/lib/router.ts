import { useEffect, useState } from 'react';

export type Route =
  | { name: 'projects' }
  | { name: 'projectNew' }
  | { name: 'project'; id: string }
  | { name: 'projectEdit'; id: string }
  | { name: 'new'; projectId: string }
  | { name: 'backup' }
  | { name: 'view'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'align'; id: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'backup') return { name: 'backup' };
  if (parts[0] === 'p' && parts[1] === 'new') return { name: 'projectNew' };
  if (parts[0] === 'p' && parts[1]) {
    if (parts[2] === 'edit') return { name: 'projectEdit', id: parts[1] };
    if (parts[2] === 'new') return { name: 'new', projectId: parts[1] };
    return { name: 'project', id: parts[1] };
  }
  if (parts[0] === 'c' && parts[1]) {
    if (parts[2] === 'edit') return { name: 'edit', id: parts[1] };
    if (parts[2] === 'align') return { name: 'align', id: parts[1] };
    return { name: 'view', id: parts[1] };
  }
  return { name: 'projects' };
}

const enc = encodeURIComponent;

export const href = {
  home: () => '#/',
  projectNew: () => '#/p/new',
  project: (id: string) => `#/p/${enc(id)}`,
  projectEdit: (id: string) => `#/p/${enc(id)}/edit`,
  new: (projectId: string) => `#/p/${enc(projectId)}/new`,
  backup: () => '#/backup',
  view: (id: string) => `#/c/${enc(id)}`,
  edit: (id: string) => `#/c/${enc(id)}/edit`,
  align: (id: string) => `#/c/${enc(id)}/align`,
};

export function navigate(to: string) {
  window.location.hash = to;
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
