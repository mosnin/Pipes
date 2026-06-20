# Installing @looper/cli

## Option 1: Pre-built binary (recommended)

Download the latest binary for your platform from the [Releases page](https://github.com/mosnin/pipes/releases/latest):

**Linux (x64):**
```bash
curl -fsSL https://github.com/mosnin/pipes/releases/latest/download/pipes-linux-x64 -o pipes
chmod +x pipes
sudo mv pipes /usr/local/bin/
```

**macOS (Apple Silicon):**
```bash
curl -fsSL https://github.com/mosnin/pipes/releases/latest/download/pipes-macos-arm64 -o pipes
chmod +x pipes
sudo mv pipes /usr/local/bin/
```

**macOS (Intel):**
```bash
curl -fsSL https://github.com/mosnin/pipes/releases/latest/download/pipes-macos-x64 -o pipes
chmod +x pipes
sudo mv pipes /usr/local/bin/
```

**Windows (x64):**
Download `pipes-win-x64.exe` from the Releases page and add it to your PATH.

## Option 2: npm (requires Node.js 18+)

```bash
npm install -g @looper/cli
```

## Setup

After installation, run:
```bash
pipes init
```

## Tab completion

```bash
# bash
echo 'eval "$(pipes completion --shell bash)"' >> ~/.bashrc

# zsh
echo 'eval "$(pipes completion --shell zsh)"' >> ~/.zshrc

# fish
pipes completion --shell fish > ~/.config/fish/completions/pipes.fish
```
