const releaseRepo = 'impleotv/stinspector-release';
const apiUrl = `https://api.github.com/repos/${releaseRepo}/releases/latest`;
const releasesUrl = `https://github.com/${releaseRepo}/releases`;
const demoFilesUrl = `https://github.com/${releaseRepo}/releases/download/v.0.0.0/testfiles.zip`;
const aptBaseUrl = `https://impleotv.github.io/stinspector-release/apt`;

const heroActions = document.getElementById('hero-actions');
const heroLinks = document.getElementById('hero-links');
const releaseStatus = document.getElementById('release-status');
const releaseMeta = document.getElementById('release-meta');
const changelogBody = document.getElementById('changelog-body');

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

  const sanitizedMarkdown = markdown
    .replace(/<a\s+name="[^"]+"\s*><\/a>\s*/gi, '')
    .replace(/^<a\s+name="[^"]+"\s*><\/a>\s*$/gim, '')
    .trim();

  const escaped = escapeHtml(sanitizedMarkdown);
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
  link.className = 'older-releases-link';
  link.href = releasesUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Older Releases';
  return link;
}

function createDemoFilesLink(downloadUrl) {
  if (!downloadUrl) {
    return null;
  }

  const link = document.createElement('a');
  link.className = 'older-releases-link';
  link.href = downloadUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Demo files';
  return link;
}

function renderHeroLinks(release) {
  if (!heroLinks) {
    return;
  }

  const links = [createOlderReleasesLink()];
  const demoFilesLink = createDemoFilesLink(demoFilesUrl);

  if (demoFilesLink) {
    links.push(demoFilesLink);
  }

  heroLinks.replaceChildren(...links);
}

function createPrimaryDownload(asset) {
  return createDownloadCard({
    heading: 'Windows',
    title: asset.name,
    description: 'Native Windows installer for desktop installation.',
    buttonLabel: 'Download Installer',
    href: asset.browser_download_url,
    size: asset.size,
  });
}

function createDownloadCard({ heading, title, description, buttonLabel, href, size, codeBlock }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'download-card';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'download-card-heading';
  eyebrow.textContent = heading;

  const name = document.createElement('h3');
  name.className = 'asset-name';
  name.textContent = title;

  const descriptionNode = document.createElement('p');
  descriptionNode.className = 'download-description';
  descriptionNode.textContent = description;

  wrapper.append(eyebrow, name, descriptionNode);

  if (href && buttonLabel) {
    const link = document.createElement('a');
    link.className = 'button';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = buttonLabel;
    wrapper.append(link);
  }

  if (Number.isFinite(size) && size > 0) {
    const sizeLabel = document.createElement('p');
    sizeLabel.className = 'download-size';
    sizeLabel.textContent = `Download size: ${formatBytes(size)}`;
    wrapper.append(sizeLabel);
  }

  if (codeBlock) {
    const code = document.createElement('pre');
    code.className = 'install-command';
    code.textContent = codeBlock;
    wrapper.append(code);
  }

  return wrapper;
}

function normalizeDebianVersion(tagName) {
  if (!tagName) {
    return '';
  }

  return tagName.startsWith('v') ? tagName.slice(1) : tagName;
}

function createLinuxDebCard(release, debAsset) {
  const debVersion = normalizeDebianVersion(release.tag_name);
  const debFileName = debAsset?.name || `stinspector_${debVersion}_amd64.deb`;
  const debUrl = debAsset?.browser_download_url || `${aptBaseUrl}/pool/main/stinspector_${debVersion}_amd64.deb`;
  const size = debAsset?.size;

  return createDownloadCard({
    heading: 'Linux .deb',
    title: debFileName,
    description: 'Direct Debian or Ubuntu package download for local installation.',
    buttonLabel: 'Download .deb',
    href: debUrl,
    size,
    codeBlock: `sudo apt install ./${debFileName}`,
  });
}

function createLinuxAptCard() {
  return createDownloadCard({
    heading: 'Linux APT',
    title: 'APT repository',
    description: 'Install and update STANAG4609 Inspector through the signed Debian or Ubuntu repository.',
    buttonLabel: 'Open APT Repository',
    href: `${aptBaseUrl}/`,
    codeBlock: [
      `curl -fsSL ${aptBaseUrl}/stinspector-apt.gpg | sudo tee /usr/share/keyrings/stinspector-apt.gpg >/dev/null`,
      `echo "deb [signed-by=/usr/share/keyrings/stinspector-apt.gpg] ${aptBaseUrl}/ stable main" | sudo tee /etc/apt/sources.list.d/stinspector.list`,
      'sudo apt update',
      'sudo apt install stinspector',
    ].join('\n'),
  });
}

function renderAssets(release) {
  const assets = release.assets || [];
  const installerAsset = assets.find((asset) => /installer.*\.exe$/i.test(asset.name))
    || assets.find((asset) => /\.exe$/i.test(asset.name));
  const debAsset = assets.find((asset) => /\.deb$/i.test(asset.name));

  const cards = [];
  if (installerAsset) {
    cards.push(createPrimaryDownload(installerAsset));
  }

  cards.push(createLinuxDebCard(release, debAsset));
  cards.push(createLinuxAptCard());

  heroActions.replaceChildren(...cards);

  if (installerAsset) {
    releaseStatus.textContent = '';
    return;
  }

  releaseStatus.textContent = 'Windows installer asset is not attached to the latest release, but Linux downloads remain available below.';
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
    renderHeroLinks(release);
    setReleaseMeta(release.tag_name, release.published_at);
    renderAssets(release);
    changelogBody.innerHTML = renderMarkdown(release.body || '');
  } catch (error) {
    const errorState = document.createElement('p');
    errorState.className = 'error-state';
    errorState.textContent = 'Release assets are temporarily unavailable.';

    heroActions.replaceChildren(errorState);
    releaseStatus.textContent = error instanceof Error ? error.message : 'Unable to load the latest release.';
    changelogBody.innerHTML = `<p class="error-state">${error instanceof Error ? error.message : 'Unable to load the latest release.'}</p>`;
  }
}

void loadLatestRelease();
