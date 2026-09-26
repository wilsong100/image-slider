import { useEffect, useState } from 'react';

export type Route =
  | { name: 'gallery' }
  | { name: 'new' }
  | { name: 'backup' }
  | { name: 'view'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'align'; id: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'new') return { name: 'new' };
  if (parts[0] === 'backup') return { name: 'backup' };
  if (parts[0] === 'c' && parts[1]) {
    if (parts[2] === 'edit') return { name: 'edit', id: parts[1] };
    if (parts[2] === 'align') return { name: 'align', id: parts[1] };
    return { name: 'view', id: parts[1] };
  }
  return { name: 'gallery' };
}

export const href = {
  gallery: () => '#/',
  new: () => '#/new',
  backup: () => '#/backup',
  view: (id: string) => `#/c/${encodeURIComponent(id)}`,
  edit: (id: string) => `#/c/${encodeURIComponent(id)}/edit`,
  align: (id: string) => `#/c/${encodeURIComponent(id)}/align`,
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
