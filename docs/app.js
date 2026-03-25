const releaseRepo = 'impleotv/stinspector-release';
const apiUrl = `https://api.github.com/repos/${releaseRepo}/releases/latest`;
const releasesUrl = `https://github.com/${releaseRepo}/releases`;

const heroActions = document.getElementById('hero-actions');
const releaseStatus = document.getElementById('release-status');

function createOlderReleasesLink() {
  const link = document.createElement('a');
  link.className = 'button button-secondary';
  link.href = releasesUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = 'Older Releases';
  return link;
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

  wrapper.append(copy, link, olderReleasesLink);
  heroActions.replaceChildren(wrapper);
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
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();
    renderAssets(release.assets || []);
  } catch (error) {
    const errorState = document.createElement('p');
    errorState.className = 'error-state';
    errorState.textContent = 'Release assets are temporarily unavailable.';

    heroActions.replaceChildren(errorState, createOlderReleasesLink());
    releaseStatus.textContent = error instanceof Error ? error.message : 'Unable to load the latest release.';
  }
}

void loadLatestRelease();
