# APT Repository Setup for COAV

This directory contains configuration for setting up a Debian/Ubuntu APT repository.

## Option 1: GitHub Releases + Manual Install (Simplest)

Users can download and install the `.deb` package directly:

```bash
# Download the latest release
curl -LO https://github.com/tact-software/coav/releases/latest/download/coav_VERSION_amd64.deb

# Install
sudo dpkg -i coav_VERSION_amd64.deb

# Fix any dependency issues
sudo apt-get install -f
```

## Option 2: GitHub Pages APT Repository

For automatic updates via `apt update && apt upgrade`, you need to host an APT repository.

### Setup Steps

1. **Create a GPG key for signing packages:**
   ```bash
   gpg --full-generate-key
   # Choose RSA, 4096 bits, no expiration
   # Export the public key
   gpg --armor --export your-email@example.com > public.gpg
   ```

2. **Set up GitHub Pages branch:**
   - Create an orphan branch `gh-pages` for the repository
   - The release workflow will publish packages there

3. **Configure repository secrets:**
   - `APT_GPG_PRIVATE_KEY`: Base64-encoded GPG private key
   - `APT_GPG_PASSPHRASE`: GPG key passphrase

### User Installation

Once the repository is set up, users can install with:

```bash
# Add the GPG key
curl -fsSL https://tact-software.github.io/coav/public.gpg | sudo gpg --dearmor -o /usr/share/keyrings/coav-archive-keyring.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/coav-archive-keyring.gpg] https://tact-software.github.io/coav stable main" | sudo tee /etc/apt/sources.list.d/coav.list

# Update and install
sudo apt update
sudo apt install coav
```

## Option 3: PPA (Personal Package Archive) - Ubuntu Only

For Ubuntu users, you can set up a PPA on Launchpad:

1. Create an account on https://launchpad.net
2. Set up a PPA at https://launchpad.net/~your-username/+activate-ppa
3. Upload source packages using `dput`

This requires maintaining source packages and is more complex than GitHub Pages.

## Files in This Directory

- `distributions` - APT repository distribution configuration
- `update-repo.sh` - Script to update the repository with new packages
