const releaseRepo = 'impleotv/stinspector-release';
const apiUrl = `https://api.github.com/repos/${releaseRepo}/releases/latest`;

const heroActions = document.getElementById('hero-actions');
const releaseStatus = document.getElementById('release-status');

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

  wrapper.append(copy, link);
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

  heroActions.innerHTML = '<p class="empty-state">No installer executable was attached to the latest release.</p>';
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
    heroActions.innerHTML = '<p class="error-state">Release assets are temporarily unavailable.</p>';
    releaseStatus.textContent = error instanceof Error ? error.message : 'Unable to load the latest release.';
  }
}

void loadLatestRelease();
