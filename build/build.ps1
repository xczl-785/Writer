# =============================================================================
# Writer 一键打包脚本 (PowerShell)
# 支持平台: Windows
# =============================================================================

param(
    [switch]$Help,
    [switch]$Clean,
    [switch]$Debug,
    [switch]$NoInstall,
    [string]$Arch = "auto"
)

# 获取脚本所在目录和项目根目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# 切换到项目根目录
Set-Location $ProjectRoot

# 颜色函数
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARNING] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Highlight { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }

# 检查命令是否存在
function Test-Command {
    param($cmd)
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# 检查 Node.js
function Check-Node {
    Write-Info "检查 Node.js..."
    if (-not (Test-Command "node")) {
        Write-Error "未安装 Node.js，请先安装 Node.js 18.x 或更高版本"
        Write-Info "下载地址: https://nodejs.org/"
        exit 1
    }
    
    $nodeVersion = (node -v).TrimStart('v').Split('.')[0]
    if ([int]$nodeVersion -lt 18) {
        Write-Warning "Node.js 版本过低 (当前: $(node -v))，推荐 20.x 或更高"
    } else {
        Write-Success "Node.js $(node -v)"
    }
}

# 检查 npm
function Check-Npm {
    Write-Info "检查 npm..."
    if (-not (Test-Command "npm")) {
        Write-Error "未安装 npm"
        exit 1
    }
    Write-Success "npm $(npm -v)"
}

# 检查 Rust
function Check-Rust {
    Write-Info "检查 Rust..."
    if (-not (Test-Command "rustc")) {
        Write-Error "未安装 Rust，请先安装 Rust"
        Write-Info "下载地址: https://rustup.rs/"
        exit 1
    }
    Write-Success "Rust $(rustc --version)"
}

# 检查 Cargo
function Check-Cargo {
    Write-Info "检查 Cargo..."
    if (-not (Test-Command "cargo")) {
        Write-Error "未安装 Cargo"
        exit 1
    }
    Write-Success "Cargo $(cargo --version)"
}

# 检查 WebView2
function Check-WebView2 {
    Write-Info "检查 WebView2 Runtime..."
    
    $webView2Path = "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application"
    if (Test-Path $webView2Path) {
        Write-Success "WebView2 Runtime 已安装"
    } else {
        Write-Warning "未检测到 WebView2 Runtime"
        Write-Info "Windows 10/11 通常已内置，若应用无法启动请安装:"
        Write-Info "https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
    }
}

# 检查依赖
function Check-Dependencies {
    Write-Info "检查依赖..."
    
    Check-Node
    Check-Npm
    Check-Rust
    Check-Cargo
    Check-WebView2
    
    Write-Success "所有依赖已就绪"
}

# 安装 npm 依赖
function Install-NpmDeps {
    Write-Info "安装 npm 依赖..."
    
    if (-not (Test-Path "node_modules")) {
        npm install
    } else {
        Write-Info "node_modules 已存在，跳过安装"
    }
    
    Write-Success "npm 依赖安装完成"
}

# 执行构建
function Invoke-Build {
    Write-Info "操作系统: Windows"
    Write-Info "打包目标: msi, nsis"
    
    $buildCmd = "npx tauri build -b msi,nsis -v"
    
    if ($Debug) {
        $buildCmd = "npx tauri build --debug -b msi,nsis -v"
    }
    
    Write-Info "执行构建命令: $buildCmd"
    Write-Host ""
    
    Invoke-Expression $buildCmd
}

# 显示构建产物
function Show-Artifacts {
    $bundleDir = "src-tauri\target\release\bundle"
    
    Write-Host ""
    Write-Success "构建完成！"
    Write-Info "构建产物位置:"
    
    if (Test-Path "$bundleDir\msi") {
        Write-Host "  MSI: $bundleDir\msi\" -ForegroundColor Cyan
    }
    if (Test-Path "$bundleDir\nsis") {
        Write-Host "  NSIS: $bundleDir\nsis\" -ForegroundColor Cyan
    }
    
    # 显示文件大小
    Write-Host ""
    Write-Info "文件列表:"
    
    $extensions = @("*.msi", "*.exe")
    foreach ($ext in $extensions) {
        Get-ChildItem -Path $bundleDir -Filter $ext -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            $size = "{0:N2} MB" -f ($_.Length / 1MB)
            Write-Host "  [$size] $($_.Name)"
        }
    }
}

# 清理构建产物
function Clear-Build {
    Write-Info "清理构建产物..."
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    
    $bundleDir = "src-tauri\target\release\bundle"
    if (Test-Path $bundleDir) {
        Remove-Item -Recurse -Force $bundleDir
    }
    
    Write-Success "清理完成"
}

# 显示帮助
function Show-Help {
    Write-Host "Writer 一键打包脚本 (PowerShell)"
    Write-Host ""
    Write-Host "用法: .\build.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Help           显示帮助信息"
    Write-Host "  -Clean          清理构建产物后重新构建"
    Write-Host "  -Debug          调试模式构建"
    Write-Host "  -NoInstall      跳过 npm 依赖安装"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\build.ps1              # 标准构建"
    Write-Host "  .\build.ps1 -Clean       # 清理后构建"
    Write-Host "  .\build.ps1 -Debug       # 调试模式"
    Write-Host ""
    Write-Host "注意: Windows 仅支持 x86_64 架构"
}

# 主函数
function Main {
    if ($Help) {
        Show-Help
        exit 0
    }
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗"
    Write-Host "║              Writer Build Script v1.1 (PowerShell)       ║"
    Write-Host "╚══════════════════════════════════════════════════════════╝"
    Write-Host ""
    
    # 检查依赖
    Check-Dependencies
    
    # 安装 npm 依赖
    if (-not $NoInstall) {
        Install-NpmDeps
    }
    
    # 清理
    if ($Clean) {
        Clear-Build
    }
    
    # 执行构建
    Write-Host ""
    Write-Info "开始构建..."
    
    Invoke-Build
    
    # 显示产物
    Show-Artifacts
}

# 执行主函数
Main