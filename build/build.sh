#!/bin/bash

# =============================================================================
# Writer 一键打包脚本
# 跨平台支持: macOS, Windows (Git Bash/WSL), Linux
# =============================================================================

set -e

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_highlight() { echo -e "${CYAN}[*]${NC} $1"; }

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        CYGWIN*|MINGW*|MSYS*)    echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

# 检测当前架构
detect_arch() {
    uname -m
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

# 检查 Node.js
check_node() {
    print_info "检查 Node.js..."
    if ! check_command node; then
        print_error "未安装 Node.js，请先安装 Node.js 18.x 或更高版本"
        print_info "下载地址: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_warning "Node.js 版本过低 (当前: $(node -v))，推荐 20.x 或更高"
    else
        print_success "Node.js $(node -v)"
    fi
}

# 检查 npm
check_npm() {
    print_info "检查 npm..."
    if ! check_command npm; then
        print_error "未安装 npm"
        exit 1
    fi
    print_success "npm $(npm -v)"
}

# 检查 Rust
check_rust() {
    print_info "检查 Rust..."
    if ! check_command rustc; then
        print_error "未安装 Rust，请先安装 Rust"
        print_info "安装命令: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    print_success "Rust $(rustc --version)"
}

# 检查 Cargo
check_cargo() {
    print_info "检查 Cargo..."
    if ! check_command cargo; then
        print_error "未安装 Cargo"
        exit 1
    fi
    print_success "Cargo $(cargo --version)"
}

# 检查 macOS Rust 目标架构
check_macos_targets() {
    local target_arch="$1"
    
    case "$target_arch" in
        arm64)
            if ! rustup target list --installed | grep -q "aarch64-apple-darwin"; then
                print_warning "未安装 aarch64-apple-darwin 目标"
                print_info "正在安装..."
                rustup target add aarch64-apple-darwin
            fi
            ;;
        x86_64)
            if ! rustup target list --installed | grep -q "x86_64-apple-darwin"; then
                print_warning "未安装 x86_64-apple-darwin 目标"
                print_info "正在安装..."
                rustup target add x86_64-apple-darwin
            fi
            ;;
        universal)
            if ! rustup target list --installed | grep -q "aarch64-apple-darwin"; then
                print_info "安装 aarch64-apple-darwin 目标..."
                rustup target add aarch64-apple-darwin
            fi
            if ! rustup target list --installed | grep -q "x86_64-apple-darwin"; then
                print_info "安装 x86_64-apple-darwin 目标..."
                rustup target add x86_64-apple-darwin
            fi
            ;;
    esac
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    check_node
    check_npm
    check_rust
    check_cargo
    
    print_success "所有依赖已就绪"
}

# 安装 npm 依赖
install_npm_deps() {
    print_info "安装 npm 依赖..."
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_info "node_modules 已存在，跳过安装"
    fi
    
    print_success "npm 依赖安装完成"
}

# 检查 Linux 系统依赖
check_linux_deps() {
    if [ "$(detect_os)" != "linux" ]; then
        return
    fi
    
    print_info "检查 Linux 系统依赖..."
    
    local missing_deps=()
    
    # 检查 webkit2gtk
    if ! pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
        missing_deps+=("libwebkit2gtk-4.1-dev")
    fi
    
    # 检查 OpenSSL
    if ! pkg-config --exists openssl 2>/dev/null; then
        missing_deps+=("libssl-dev")
    fi
    
    # 检查 GTK
    if ! pkg-config --exists gtk+-3.0 2>/dev/null; then
        missing_deps+=("libgtk-3-dev")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_warning "缺少以下系统依赖:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        print_info "安装命令 (Debian/Ubuntu):"
        echo "  sudo apt install ${missing_deps[*]}"
        print_info "是否继续构建？(y/n)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Linux 系统依赖已满足"
    fi
}

# 获取打包目标
get_build_targets() {
    local os=$(detect_os)
    case "$os" in
        macos)  echo "app,dmg" ;;
        linux)  echo "deb,appimage" ;;
        windows) echo "msi,nsis" ;;
        *)      echo "all" ;;
    esac
}

# 获取 macOS 架构目标
get_macos_arch_target() {
    local target_arch="$1"
    
    case "$target_arch" in
        arm64)
            echo "aarch64-apple-darwin"
            ;;
        x86_64)
            echo "x86_64-apple-darwin"
            ;;
        universal)
            echo "universal-apple-darwin"
            ;;
        auto|*)
            # 默认使用当前机器架构
            local current_arch=$(detect_arch)
            if [ "$current_arch" = "arm64" ]; then
                echo "aarch64-apple-darwin"
            else
                echo "x86_64-apple-darwin"
            fi
            ;;
    esac
}

# 执行构建
run_build() {
    local os=$(detect_os)
    local targets=$(get_build_targets)
    local arch_target=""
    local target_arch="$1"
    
    # macOS 架构处理
    if [ "$os" = "macos" ]; then
        arch_target=$(get_macos_arch_target "$target_arch")
        check_macos_targets "$target_arch"
        
        print_highlight "目标架构: $arch_target"
    fi
    
    print_info "操作系统: $os"
    print_info "打包目标: $targets"
    
    # 构建命令
    local build_cmd="npx tauri build"
    
    if [ -n "$targets" ]; then
        build_cmd="$build_cmd -b $targets"
    fi
    
    if [ -n "$arch_target" ]; then
        build_cmd="$build_cmd -t $arch_target"
    fi
    
    # 添加详细输出
    build_cmd="$build_cmd -v"
    
    print_info "执行构建命令: $build_cmd"
    echo ""
    
    # 执行构建
    eval "$build_cmd"
}

# 显示构建产物
show_artifacts() {
    local os=$(detect_os)
    local bundle_dir="src-tauri/target/release/bundle"
    
    echo ""
    print_success "构建完成！"
    print_info "构建产物位置:"
    
    case "$os" in
        macos)
            if [ -d "$bundle_dir/dmg" ]; then
                echo "  DMG: $bundle_dir/dmg/"
            fi
            if [ -d "$bundle_dir/macos" ]; then
                echo "  APP: $bundle_dir/macos/"
            fi
            ;;
        linux)
            if [ -d "$bundle_dir/deb" ]; then
                echo "  DEB: $bundle_dir/deb/"
            fi
            if [ -d "$bundle_dir/appimage" ]; then
                echo "  AppImage: $bundle_dir/appimage/"
            fi
            ;;
        windows)
            if [ -d "$bundle_dir/msi" ]; then
                echo "  MSI: $bundle_dir/msi/"
            fi
            if [ -d "$bundle_dir/nsis" ]; then
                echo "  NSIS: $bundle_dir/nsis/"
            fi
            ;;
    esac
    
    # 显示文件大小
    echo ""
    print_info "文件列表:"
    find "$bundle_dir" -type f \( -name "*.dmg" -o -name "*.app" -o -name "*.msi" -o -name "*.exe" -o -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" \) 2>/dev/null | while read -r file; do
        if [ -f "$file" ]; then
            local size=$(du -h "$file" | cut -f1)
            echo "  [$size] $(basename "$file")"
        fi
    done
}

# 清理构建产物
clean_build() {
    print_info "清理构建产物..."
    rm -rf dist/
    rm -rf src-tauri/target/release/bundle/
    print_success "清理完成"
}

# 显示帮助
show_help() {
    local current_arch=$(detect_arch)
    
    echo "Writer 一键打包脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -c, --clean         清理构建产物后重新构建"
    echo "  -d, --debug         调试模式构建"
    echo "  --no-install        跳过 npm 依赖安装"
    echo ""
    echo "macOS 架构选项:"
    echo "  --arch <arch>       指定目标架构"
    echo "                      arm64     - Apple Silicon (M1/M2/M3)"
    echo "                      x86_64    - Intel Mac"
    echo "                      universal - 通用二进制 (同时支持两种架构)"
    echo "                      auto      - 当前机器架构 (默认: $current_arch)"
    echo ""
    echo "示例:"
    echo "  $0                      # 标准构建 (当前架构)"
    echo "  $0 --arch arm64         # 构建 Apple Silicon 版本"
    echo "  $0 --arch x86_64        # 构建 Intel Mac 版本"
    echo "  $0 --arch universal     # 构建通用二进制"
    echo "  $0 --clean              # 清理后构建"
    echo "  $0 --debug              # 调试模式"
    echo ""
    echo "当前机器: $(detect_os) / $current_arch"
}

# 主函数
main() {
    local clean=0
    local debug=0
    local install_deps=1
    local target_arch="auto"
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean=1
                shift
                ;;
            -d|--debug)
                debug=1
                shift
                ;;
            --no-install)
                install_deps=0
                shift
                ;;
            --arch)
                shift
                if [ -z "$1" ]; then
                    print_error "--arch 需要指定架构 (arm64/x86_64/universal/auto)"
                    exit 1
                fi
                target_arch="$1"
                shift
                ;;
            *)
                print_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║              Writer Build Script v1.1                    ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 检查 Linux 系统依赖
    check_linux_deps
    
    # 安装 npm 依赖
    if [ $install_deps -eq 1 ]; then
        install_npm_deps
    fi
    
    # 清理
    if [ $clean -eq 1 ]; then
        clean_build
    fi
    
    # 执行构建
    echo ""
    print_info "开始构建..."
    
    if [ $debug -eq 1 ]; then
        npx tauri build --debug -v
    else
        run_build "$target_arch"
    fi
    
    # 显示产物
    show_artifacts
}

# 执行主函数
main "$@"