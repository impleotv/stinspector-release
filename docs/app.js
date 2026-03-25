const releaseRepo = 'impleotv/stinspector-release';
const apiUrl = `https://api.github.com/repos/${releaseRepo}/releases/latest`;
const releasesUrl = `https://github.com/${releaseRepo}/releases`;

const heroActions = document.getElementById('hero-actions');
const heroLinks = document.getElementById('hero-links');
const releaseStatus = document.getElementById('release-status');
const releaseMeta = document.getElementById('release-meta');
const changelogBody = document.getElementById('changelog-body');

function formatDate(isoDate) {
  if (!isoDate) {
    return 'Unknown';
  }

  const value = new Date(isoDate);
  if (Number.isNaN(value.getTime())) {
    return isoDate;
  }

  return value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderMarkdown(markdown) {
  if (!markdown || !markdown.trim()) {
    return '<p class="empty-state">Release notes were not provided for this version.</p>';
  }

  const escaped = escapeHtml(markdown.trim());
  const lines = escaped.split(/\r?\n/);
  let html = '';
  let listOpen = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (listOpen) {
        html += '</ul>';
        listOpen = false;
      }
      continue;
    }

    if (line.startsWith('### ')) {
      if (listOpen) {
        html += '</ul>';
        listOpen = false;
      }
      html += `<h3>${line.slice(4)}</h3>`;
      continue;
    }

    if (line.startsWith('## ')) {
      if (listOpen) {
        html += '</ul>';
        listOpen = false;
      }
      html += `<h2>${line.slice(3)}</h2>`;
      continue;
    }

    if (line.startsWith('* ')) {
      if (!listOpen) {
        html += '<ul>';
        listOpen = true;
      }
      html += `<li>${line.slice(2)}</li>`;
      continue;
    }

    if (listOpen) {
      html += '</ul>';
      listOpen = false;
    }

    html += `<p>${line}</p>`;
  }

  if (listOpen) {
    html += '</ul>';
  }

  return html.replaceAll(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function setReleaseMeta(version, releasedAt) {
  const items = releaseMeta?.querySelectorAll('dd');
  if (!items || items.length < 2) {
    return;
  }

  items[0].textContent = version || 'Unknown';
  items[1].textContent = formatDate(releasedAt);
}

function createOlderReleasesLink() {
  const link = document.createElement('a');
  link.className = 'button button-secondary';
  link.href = releasesUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Older Releases';
  return link;
}

function renderHeroLinks() {
  if (!heroLinks) {
    return;
  }

  heroLinks.replaceChildren(createOlderReleasesLink());
}

function createPrimaryDownload(asset) {
  const wrapper = document.createElement('div');
  wrapper.className = 'primary-download-card';

  const copy = document.createElement('div');
  copy.innerHTML = `
    <h3>${asset.name}</h3>
    <p class="release-status">Windows installer setup for the latest public release.</p>
  `;

  const link = document.createElement('a');
  link.className = 'button';
  link.href = asset.browser_download_url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Download Installer';

  const olderReleasesLink = createOlderReleasesLink();

  wrapper.append(copy, link);
  heroActions.replaceChildren(wrapper);

  if (heroLinks) {
    heroLinks.replaceChildren(olderReleasesLink);
  }
}

function renderAssets(assets) {
  const installerAsset = assets.find((asset) => /installer.*\.exe$/i.test(asset.name))
    || assets.find((asset) => /\.exe$/i.test(asset.name));

  if (installerAsset) {
    createPrimaryDownload(installerAsset);
    releaseStatus.textContent = 'Latest public Windows installer.';
    return;
  }

  const emptyState = document.createElement('p');
  emptyState.className = 'empty-state';
  emptyState.textContent = 'No installer executable was attached to the latest release.';

  heroActions.replaceChildren(emptyState, createOlderReleasesLink());
  releaseStatus.textContent = 'Release found, but no installer asset is available.';
}

async function loadLatestRelease() {
  try {
    renderHeroLinks();

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();
    setReleaseMeta(release.tag_name, release.published_at);
    renderAssets(release.assets || []);
    changelogBody.innerHTML = renderMarkdown(release.body || '');
  } catch (error) {
    const errorState = document.createElement('p');
    errorState.className = 'error-state';
    errorState.textContent = 'Release assets are temporarily unavailable.';

    heroActions.replaceChildren(errorState, createOlderReleasesLink());
    releaseStatus.textContent = error instanceof Error ? error.message : 'Unable to load the latest release.';
    changelogBody.innerHTML = `<p class="error-state">${error instanceof Error ? error.message : 'Unable to load the latest release.'}</p>`;
  }
}

void loadLatestRelease();
