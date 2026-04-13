# GitHub Push Tool

Simple script to upload files to GitHub with auto proxy detection.

## Usage

```cmd
push.bat "commit message"
```

Example:
```cmd
push.bat "feat: add new feature"
push.bat "fix: bug fix"
```

## Features

- Auto detect Git repository
- Auto detect proxy (V2RayN/Clash)
- Auto configure/clear proxy
- Check network connection
- Pull before push (avoid conflicts)

## Supported Proxy

| Software | Ports |
|----------|-------|
| V2RayN | 10808, 10809 |
| Clash | 7890, 7891 |

## Files

- `push.ps1` - PowerShell script
- `push.bat` - Batch file (easy to use)