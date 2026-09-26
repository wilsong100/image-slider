import { Align } from './pages/Align';
import { Backup } from './pages/Backup';
import { Editor } from './pages/Editor';
import { Project } from './pages/Project';
import { ProjectForm } from './pages/ProjectForm';
import { Projects } from './pages/Projects';
import { Viewer } from './pages/Viewer';
import { href, useRoute } from './lib/router';

export function App() {
  const route = useRoute();
  return (
    <>
      <header className="topbar">
        <a className="brand" href={href.home()}>
          <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M4 15 16 5l12 10v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" fill="var(--before)" />
            <path d="M16 5l12 10v12a1 1 0 0 1-1 1H16Z" fill="var(--accent)" />
            <path d="M16 3v27" stroke="var(--surface)" strokeWidth="2" />
          </svg>
          <span>Then &amp; Now</span>
        </a>
        <nav className="topbar__nav">
          <a className={route.name === 'backup' ? 'is-active' : ''} href={href.backup()}>
            Backup
          </a>
        </nav>
      </header>
      <main>
        {route.name === 'projects' && <Projects />}
        {route.name === 'projectNew' && <ProjectForm key="new" />}
        {route.name === 'project' && <Project key={route.id} id={route.id} />}
        {route.name === 'projectEdit' && <ProjectForm key={route.id} id={route.id} />}
        {route.name === 'new' && <Editor key={`new-${route.projectId}`} projectId={route.projectId} />}
        {route.name === 'edit' && <Editor key={route.id} id={route.id} />}
        {route.name === 'backup' && <Backup />}
        {route.name === 'align' && <Align key={route.id} id={route.id} />}
        {route.name === 'view' && <Viewer key={route.id} id={route.id} />}
      </main>
    </>
  );
}
