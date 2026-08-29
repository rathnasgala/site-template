(() => {
  const page = document.querySelector('[data-version-page]');
  if (!(page instanceof HTMLElement)) return;
  const modules = Object.freeze([
    { id: 'app', name: 'Gala App', url: 'https://app.gala67.com/version.json' },
    { id: 'api', name: 'Gala API', url: `${page.dataset.apiBaseUrl}/v1/version?siteId=${encodeURIComponent(page.dataset.siteId ?? '')}` },
    { id: 'cli', name: 'Gala CLI', url: 'https://registry.npmjs.org/%40rathnasgala%2Fcli/latest', repository: 'https://github.com/rathnasgala/cli', repositoryName: 'rathnasgala/cli' },
    { id: 'theme', name: 'Gala Site Template', url: 'https://registry.npmjs.org/%40rathnasgala%2Ftheme/latest', repository: 'https://github.com/rathnasgala/site-template', repositoryName: 'rathnasgala/site-template' },
    { id: 'content-validation', name: 'Gala Content Validation', url: 'https://registry.npmjs.org/%40rathnasgala%2Fcontent-validation/latest', repository: 'https://github.com/rathnasgala/publish', repositoryName: 'rathnasgala/publish' }
  ]);
  const commitPattern = /^[0-9a-f]{40}$/;
  function exactCommit(value) {
    if (commitPattern.test(value?.commit)) return value.commit;
    if (commitPattern.test(value?.gala?.sourceCommit)) return value.gala.sourceCommit;
    if (commitPattern.test(value?.gitHead)) return value.gitHead;
    return null;
  }
  function render(module, result) {
    const card = page.querySelector(`[data-version-module="${module.id}"]`);
    if (!(card instanceof HTMLElement)) return;
    card.replaceChildren();
    card.removeAttribute('aria-busy');
    const heading = document.createElement('h2');
    heading.textContent = module.name;
    card.append(heading);
    if (result.status === 'rejected') {
      const status = document.createElement('p');
      status.className = 'gala-version-status gala-version-status--error';
      status.textContent = 'Live version unavailable. Refresh to retry this source.';
      card.append(status);
      return;
    }
    const value = result.value;
    if (typeof value.version === 'string') {
      const release = document.createElement('p');
      release.textContent = `Release ${value.version}`;
      card.append(release);
    }
    if (module.repository) {
      const repository = document.createElement('a');
      repository.href = module.repository;
      repository.textContent = module.repositoryName;
      card.append(repository);
      const commit = exactCommit(value);
      if (commit) {
        const link = document.createElement('a');
        link.href = `${module.repository}/commit/${commit}`;
        link.className = 'gala-version-commit';
        link.textContent = commit.slice(0, 8);
        card.append(link);
      } else {
        const status = document.createElement('p');
        status.className = 'gala-version-status gala-version-status--error';
        status.textContent = 'The live source did not report an exact commit.';
        card.append(status);
      }
    }
    if (typeof value.builtAt === 'string') {
      const built = document.createElement('time');
      built.dateTime = value.builtAt;
      built.textContent = `Built ${new Date(value.builtAt).toLocaleString()}`;
      card.append(built);
    }
  }
  async function load(module) {
    const response = await fetch(module.url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`VERSION_${response.status}`);
    return response.json();
  }
  async function refresh() {
    for (const card of page.querySelectorAll('[data-version-module]')) {
      card.setAttribute('aria-busy', 'true');
      card.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Loading version…' }));
    }
    const results = await Promise.allSettled(modules.map(load));
    modules.forEach((module, index) => render(module, results[index]));
  }
  page.querySelector('[data-version-retry]')?.addEventListener('click', refresh);
  refresh();
})();
