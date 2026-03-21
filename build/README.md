# Build 脚本说明

## 版本号管理

```bash
pnpm version:update
```

显示当前版本号，输入新版本号更新，或直接回车跳过。

- 权威来源：`src-tauri/tauri.conf.json`
- 同步文件：`package.json`

## 打包构建

### Windows

```powershell
.\build\build.ps1
```

参数：

- `-Clean` - 清理后构建
- `-Debug` - 调试模式

### macOS / Linux

```bash
./build/build.sh
```

参数：

- `--clean` - 清理后构建
- `--debug` - 调试模式
- `--arch arm64|x86_64|universal` - macOS 架构选择

## 打包前检查清单

- [ ] 确认版本号已更新（`pnpm version:update`）
- [ ] 确认代码无 lint 错误（`pnpm lint`）
- [ ] 确认测试通过（`pnpm test`）

## 构建产物

| 平台    | 产物位置                                              |
| ------- | ----------------------------------------------------- |
| Windows | `src-tauri/target/release/bundle/msi/` 或 `nsis/`     |
| macOS   | `src-tauri/target/release/bundle/dmg/` 或 `macos/`    |
| Linux   | `src-tauri/target/release/bundle/deb/` 或 `appimage/` |
