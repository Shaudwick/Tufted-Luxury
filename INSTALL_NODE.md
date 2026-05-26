# Install Node.js on macOS

## Option 1: Install via Homebrew (Recommended)

If you have Homebrew installed:

```bash
brew install node
```

## Option 2: Download Installer (Easiest)

1. Visit: https://nodejs.org/
2. Download the **LTS (Long Term Support)** version for macOS
3. Run the installer (.pkg file)
4. Follow the installation wizard
5. Restart your terminal after installation

## Option 3: Install via nvm (Node Version Manager)

If you want to manage multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js
nvm install --lts
nvm use --lts
```

## Verify Installation

After installing, verify it works:

```bash
node --version
npm --version
```

You should see version numbers like:
```
v20.10.0
10.2.3
```

## After Installation

Once Node.js is installed, you can:

1. Start your server:
   ```bash
   cd /Users/shaudy/Documents/GitHub/Tufted-Luxury
   node server.js
   ```

2. Send test emails (development only; configure `.env` first):
   - Visit: `http://localhost:4242/test-email?email=you@example.com`
   - Or: `curl "http://localhost:4242/test-email?email=you@example.com"`

## Troubleshooting

If you still get "command not found" after installation:
- Restart your terminal
- Check PATH: `echo $PATH`
- Verify installation: `which node` or `which nodejs`

