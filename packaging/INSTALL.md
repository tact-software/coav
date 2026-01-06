# COAV Installation Guide

## macOS

### Homebrew (Recommended)

Once the Homebrew tap is set up, you can install COAV with:

```bash
# Add the tap
brew tap tact-software/coav

# Install COAV
brew install --cask coav
```

To update:
```bash
brew upgrade --cask coav
```

### Manual Installation

1. Download the latest `.dmg` file from [GitHub Releases](https://github.com/tact-software/coav/releases)
2. Open the `.dmg` file
3. Drag COAV to your Applications folder

## Linux (Debian/Ubuntu)

### APT Repository (Recommended)

If the APT repository is enabled, you can install with:

```bash
# Add the GPG key
curl -fsSL https://tact-software.github.io/coav/public.gpg | sudo gpg --dearmor -o /usr/share/keyrings/coav-archive-keyring.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/coav-archive-keyring.gpg] https://tact-software.github.io/coav stable main" | sudo tee /etc/apt/sources.list.d/coav.list

# Update and install
sudo apt update
sudo apt install coav
```

To update:
```bash
sudo apt update
sudo apt upgrade coav
```

### Manual Installation (.deb)

```bash
# Download the latest .deb file
curl -LO https://github.com/tact-software/coav/releases/latest/download/coav_VERSION_amd64.deb

# Install
sudo dpkg -i coav_*.deb

# Fix any dependency issues
sudo apt-get install -f
```

### AppImage

```bash
# Download the latest AppImage
curl -LO https://github.com/tact-software/coav/releases/latest/download/coav_VERSION_amd64.AppImage

# Make it executable
chmod +x coav_*.AppImage

# Run it
./coav_*.AppImage
```

## Linux (Fedora/RHEL/CentOS)

### Manual Installation (.rpm)

```bash
# Download the latest .rpm file
curl -LO https://github.com/tact-software/coav/releases/latest/download/coav-VERSION-1.x86_64.rpm

# Install
sudo rpm -i coav-*.rpm
# or with dnf
sudo dnf install coav-*.rpm
```

---

## Setting Up Package Repositories (For Maintainers)

### Homebrew Tap Setup

1. Create a new repository: `tact-software/homebrew-coav`

2. Create the directory structure:
   ```
   homebrew-coav/
   └── Casks/
       └── coav.rb
   ```

3. Copy the workflow from `packaging/homebrew/tap-workflow.yml` to `.github/workflows/update-cask.yml`

4. In the main coav repository, add the following secrets:
   - `HOMEBREW_TAP_TOKEN`: A GitHub token with write access to the tap repository

5. Set the repository variable:
   - `ENABLE_HOMEBREW_TAP`: `true`

### APT Repository Setup

1. Generate a GPG key for signing:
   ```bash
   gpg --full-generate-key
   # Export public key
   gpg --armor --export your-email@example.com > public.gpg
   # Export private key (base64 encoded)
   gpg --armor --export-secret-keys your-email@example.com | base64 > private.gpg.b64
   ```

2. Create a `gh-pages` branch with the public key:
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   cp public.gpg .
   git add public.gpg
   git commit -m "Initial APT repository setup"
   git push origin gh-pages
   ```

3. Enable GitHub Pages for the `gh-pages` branch in repository settings

4. Add the following secrets to the repository:
   - `APT_GPG_PRIVATE_KEY`: Content of `private.gpg.b64`

5. Set the repository variable:
   - `ENABLE_APT_REPO`: `true`

### Enabling Package Repository Updates

Both Homebrew and APT repository updates are optional and controlled by repository variables:

| Variable | Description |
|----------|-------------|
| `ENABLE_HOMEBREW_TAP` | Set to `true` to enable Homebrew tap updates |
| `ENABLE_APT_REPO` | Set to `true` to enable APT repository updates |

These can be configured in: Settings → Secrets and variables → Actions → Variables
