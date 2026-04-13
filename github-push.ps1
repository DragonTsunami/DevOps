# GitHub 上传脚本
# 用法: .\github-push.ps1 -Message "提交信息"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,

    [string]$Branch = "main",
    [switch]$Force,
    [switch]$NoProxy
)

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }

# 检查函数
function Test-GitRepository {
    if (-not (Test-Path ".git")) {
        Write-Error "❌ 错误: 当前目录不是 Git 仓库"
        return $false
    }
    Write-Success "✅ Git 仓库检查通过"
    return $true
}

function Test-GitConfig {
    $userName = git config user.name
    $userEmail = git config user.email

    if (-not $userName -or -not $userEmail) {
        Write-Warning "⚠️  警告: Git 用户信息未配置"
        Write-Info "   请运行以下命令配置:"
        Write-Info "   git config user.name `"Your Name`""
        Write-Info "   git config user.email `"your@email.com`""
        return $false
    }
    Write-Success "✅ Git 用户配置: $userName <$userEmail>"
    return $true
}

function Test-NetworkConnection {
    Write-Info "🔍 检测网络连接..."
    try {
        $response = Invoke-WebRequest -Uri "https://github.com" -UseBasicParsing -TimeoutSec 10
        Write-Success "✅ GitHub 网络连接正常"
        return $true
    }
    catch {
        Write-Warning "⚠️  无法直接连接 GitHub"
        return $false
    }
}

function Test-ProxyConnection {
    Write-Info "🔍 检测代理连接..."

    # 检查 V2RayN
    $v2rayPorts = @(10808, 10809, 10810)
    foreach ($port in $v2rayPorts) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $result = $tcpClient.BeginConnect("127.0.0.1", $port, $null, $null)
            $success = $result.AsyncWaitHandle.WaitOne(1000, $false)
            $tcpClient.Close()

            if ($success) {
                Write-Success "✅ 检测到代理端口: $port"
                return $port
            }
        }
        catch {
            continue
        }
    }

    # 检查 Clash
    $clashPorts = @(7890, 7891)
    foreach ($port in $clashPorts) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $result = $tcpClient.BeginConnect("127.0.0.1", $port, $null, $null)
            $success = $result.AsyncWaitHandle.WaitOne(1000, $false)
            $tcpClient.Close()

            if ($success) {
                Write-Success "✅ 检测到 Clash 代理端口: $port"
                return $port
            }
        }
        catch {
            continue
        }
    }

    Write-Warning "⚠️  未检测到代理"
    return $null
}

function Set-GitProxy($port) {
    if ($port) {
        Write-Info "🔧 配置 Git 代理: http://127.0.0.1:$port"
        git config http.proxy "http://127.0.0.1:$port"
        git config https.proxy "http://127.0.0.1:$port"
    }
}

function Clear-GitProxy {
    Write-Info "🔧 清除 Git 代理配置"
    git config --unset http.proxy 2>$null
    git config --unset https.proxy 2>$null
}

function Test-GitStatus {
    $status = git status --porcelain
    if ($status) {
        Write-Warning "⚠️  检测到未提交的更改:"
        Write-Output $status
        return $true
    }
    Write-Success "✅ 工作区干净"
    return $false
}

function Test-RemoteBranch($branch) {
    $remoteBranch = git ls-remote --heads origin $branch
    if ($remoteBranch) {
        Write-Success "✅ 远程分支 $branch 存在"
        return $true
    }
    Write-Warning "⚠️  远程分支 $branch 不存在，将创建新分支"
    return $false
}

# 主流程
Write-Info "=========================================="
Write-Info "      GitHub 上传脚本"
Write-Info "=========================================="
Write-Output ""

# 1. 检查 Git 仓库
if (-not (Test-GitRepository)) {
    exit 1
}

# 2. 检查 Git 配置
Test-GitConfig | Out-Null

# 3. 检查网络连接
$directConnection = Test-NetworkConnection
if (-not $directConnection) {
    if ($NoProxy) {
        Write-Error "❌ 无法连接 GitHub，且禁用了代理"
        exit 1
    }

    # 检测代理
    $proxyPort = Test-ProxyConnection
    if ($proxyPort) {
        Set-GitProxy $proxyPort
    } else {
        Write-Error "❌ 无法连接 GitHub，请检查网络或启动代理"
        exit 1
    }
} else {
    if (-not $NoProxy) {
        Clear-GitProxy
    }
}

# 4. 检查工作区状态
$hasChanges = Test-GitStatus

# 5. 检查远程分支
Test-RemoteBranch $Branch | Out-Null

# 6. 执行 Git 操作
Write-Output ""
Write-Info "=========================================="
Write-Info "      开始上传"
Write-Info "=========================================="
Write-Output ""

try {
    # 添加文件
    Write-Info "📦 添加文件到暂存区..."
    git add .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ git add 失败"
        exit 1
    }
    Write-Success "✅ 文件添加成功"

    # 提交
    Write-Info "💾 提交更改..."
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        if ($hasChanges) {
            Write-Error "❌ git commit 失败"
            exit 1
        } else {
            Write-Warning "⚠️  没有需要提交的更改"
        }
    } else {
        Write-Success "✅ 提交成功"
    }

    # 拉取最新代码
    Write-Info "📥 拉取远程更新..."
    git pull origin $Branch --rebase
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "⚠️  拉取失败，可能存在冲突"
        Write-Info "   请手动解决冲突后重试"
        exit 1
    }
    Write-Success "✅ 拉取成功"

    # 推送
    Write-Info "🚀 推送到远程仓库..."
    $pushArgs = @("push", "-u", "origin", $Branch)
    if ($Force) {
        $pushArgs += "--force"
    }
    & git $pushArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ git push 失败"
        exit 1
    }
    Write-Success "✅ 推送成功"

} catch {
    Write-Error "❌ 发生错误: $_"
    exit 1
} finally {
    # 清理代理配置
    if (-not $directConnection -and -not $NoProxy) {
        Clear-GitProxy
    }
}

# 7. 显示结果
Write-Output ""
Write-Info "=========================================="
Write-Info "      上传完成"
Write-Info "=========================================="
Write-Output ""

# 获取远程仓库 URL
$remoteUrl = git remote get-url origin
Write-Success "📦 仓库地址: $remoteUrl"
Write-Success "🌿 分支: $Branch"

# 显示最近提交
Write-Output ""
Write-Info "📝 最近提交:"
git log --oneline -3

Write-Output ""
Write-Success "✅ 所有操作完成！"