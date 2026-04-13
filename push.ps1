# GitHub Upload Script
# Usage: .\push.ps1 -Message "commit message"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    [string]$Branch = "main"
)

# Output functions
function Write-Ok { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Fail { Write-Host "[FAIL] $args" -ForegroundColor Red }
function Write-Step { Write-Host "[STEP] $args" -ForegroundColor Cyan }

# Check git repo
Write-Step "Checking git repository..."
if (-not (Test-Path ".git")) {
    Write-Fail "Not a git repository"
    exit 1
}
Write-Ok "Git repository found"

# Check git config
Write-Step "Checking git config..."
$userName = git config user.name
$userEmail = git config user.email
if (-not $userName -or -not $userEmail) {
    Write-Warn "Git user not configured"
    Write-Host "Run: git config user.name 'Your Name'"
    Write-Host "Run: git config user.email 'your@email.com'"
    exit 1
}
Write-Ok "Git user: $userName <$userEmail>"

# Test network
Write-Step "Testing network connection..."
$useProxy = $false
$proxyPort = $null

try {
    $null = Invoke-WebRequest -Uri "https://github.com" -UseBasicParsing -TimeoutSec 5
    Write-Ok "Direct connection to GitHub works"
} catch {
    Write-Warn "Cannot connect to GitHub directly"
    Write-Step "Detecting proxy..."

    # Check common proxy ports
    $ports = @(10808, 10809, 7890, 7891)
    foreach ($port in $ports) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $ar = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
            if ($ar.AsyncWaitHandle.WaitOne(500, $false)) {
                $tcp.Close()
                $proxyPort = $port
                $useProxy = $true
                Write-Ok "Found proxy on port $port"
                break
            }
            $tcp.Close()
        } catch {}
    }

    if (-not $useProxy) {
        Write-Fail "No proxy found. Please start V2RayN or Clash"
        exit 1
    }
}

# Configure proxy if needed
if ($useProxy) {
    Write-Step "Configuring git proxy..."
    git config http.proxy "http://127.0.0.1:$proxyPort"
    git config https.proxy "http://127.0.0.1:$proxyPort"
    Write-Ok "Proxy configured"
}

# Check status
Write-Step "Checking git status..."
$status = git status --porcelain
if ($status) {
    Write-Warn "Uncommitted changes detected"
    Write-Host $status
}

# Git operations
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Uploading to GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Add files
    Write-Step "Adding files..."
    git add .
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "git add failed"
        exit 1
    }
    Write-Ok "Files added"

    # Commit
    Write-Step "Committing..."
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        if (-not $status) {
            Write-Warn "Nothing to commit"
        } else {
            Write-Fail "git commit failed"
            exit 1
        }
    } else {
        Write-Ok "Committed"
    }

    # Pull
    Write-Step "Pulling from remote..."
    git pull origin $Branch --rebase
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "git pull failed - possible conflict"
        exit 1
    }
    Write-Ok "Pulled successfully"

    # Push
    Write-Step "Pushing to remote..."
    git push -u origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "git push failed"
        exit 1
    }
    Write-Ok "Pushed successfully"

} catch {
    Write-Fail "Error: $_"
    exit 1
} finally {
    # Clean up proxy
    if ($useProxy) {
        Write-Step "Cleaning up proxy config..."
        git config --unset http.proxy 2>$null
        git config --unset https.proxy 2>$null
        Write-Ok "Proxy config removed"
    }
}

# Result
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "       Upload Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$remoteUrl = git remote get-url origin
Write-Ok "Repository: $remoteUrl"
Write-Ok "Branch: $Branch"

Write-Host ""
Write-Host "Recent commits:" -ForegroundColor Cyan
git log --oneline -3

Write-Host ""
Write-Ok "Done!"