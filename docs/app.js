const releaseRepo = 'impleotv/stinspector-release';
const apiUrl = `https://api.github.com/repos/${releaseRepo}/releases/latest`;

const heroActions = document.getElementById('hero-actions');
const releaseMeta = document.getElementById('release-meta');
const releaseSummary = document.getElementById('release-summary');
const releaseHeading = document.getElementById('latest-release-heading');
const primaryDownload = document.getElementById('primary-download');
const assetList = document.getElementById('asset-list');
const releaseNotes = document.getElementById('release-notes');
const assetTemplate = document.getElementById('asset-template');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

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

function setMetaItem(label, value) {
  const wrapper = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = value;
  wrapper.append(dt, dd);
  releaseMeta.appendChild(wrapper);
}

function createPrimaryDownload(asset) {
  const wrapper = document.createElement('div');
  wrapper.className = 'primary-download-card';

  const copy = document.createElement('div');
  copy.innerHTML = `
    <p class="panel-kicker">Recommended</p>
    <h3>${asset.name}</h3>
    <p class="release-summary">Windows installer setup for the latest public release.</p>
  `;

  const link = document.createElement('a');
  link.className = 'button';
  link.href = asset.browser_download_url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Download Installer';

  wrapper.append(copy, link);
  primaryDownload.replaceChildren(wrapper);
  heroActions.prepend(link.cloneNode(true));
}

function renderAssets(assets) {
  assetList.replaceChildren();
  primaryDownload.replaceChildren();

  if (!Array.isArray(assets) || assets.length === 0) {
    assetList.innerHTML = '<li class="empty-state">No downloadable assets were attached to the latest release.</li>';
    return;
  }

  const installerAsset = assets.find((asset) => /installer.*\.exe$/i.test(asset.name))
    || assets.find((asset) => /\.exe$/i.test(asset.name));

  if (installerAsset) {
    createPrimaryDownload(installerAsset);
  }

  for (const asset of assets) {
    const item = assetTemplate.content.firstElementChild.cloneNode(true);
    item.querySelector('.asset-name').textContent = asset.name;
    item.querySelector('.asset-meta').textContent = `${formatBytes(asset.size)} â€¢ ${asset.download_count ?? 0} downloads`;
    const link = item.querySelector('a');
    link.href = asset.browser_download_url;
    assetList.appendChild(item);
  }
}

async function loadLatestRelease() {
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();
    releaseHeading.textContent = release.name || release.tag_name || 'Latest release';
    releaseSummary.textContent = release.body && release.body.trim()
      ? 'Published release notes and downloadable assets from the latest tagged build.'
      : 'Latest tagged build with downloadable assets.';

    releaseMeta.replaceChildren();
    setMetaItem('Version', release.tag_name || 'Unknown');
    setMetaItem('Published', formatDate(release.published_at));
    setMetaItem('Repository', releaseRepo);

    renderAssets(release.assets || []);
    releaseNotes.innerHTML = renderMarkdown(release.body || '');
  } catch (error) {
    releaseHeading.textContent = 'Unable to load the latest release';
    releaseSummary.textContent = 'The public GitHub API request failed.';
    assetList.innerHTML = '<li class="error-state">Release assets are temporarily unavailable.</li>';
    releaseNotes.innerHTML = `<p class="error-state">${error instanceof Error ? error.message : 'Unknown error'}</p>`;
  }
}

void loadLatestRelease();
