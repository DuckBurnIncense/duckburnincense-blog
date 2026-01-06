---
title: 分析并解决新安全限制导致 Ubuntu 24.04 下运行 electron 的 AppImage 报错 The SUID sandbox helper binary was found, but is not configured correctly
published: 2026-01-07
description: "报错类似 The SUID sandbox helper binary was found, but is not configured correctly. Rather than run without sandboxing I'm aborting now. You need to make sure that /tmp/.mount_LyuKLU/chrome-sandbox is owned by root and has mode 4755."
category: 'Electron'
tags: ['Electron', '故障排除']
---

## 复现方法

使用如下命令, 运行我刚构建好的 electron 程序:

```bash
$ chmod +x ./my-electron-app.AppImage
$ ./my-electron-app.AppImage
```

报错如下

```text
[26568:0107/005131.867292:FATAL:sandbox/linux/suid/client/setuid_sandbox_host.cc:166] The SUID sandbox helper binary was found, but is not configured correctly. Rather than run without sandboxing I'm aborting now. You need to make sure that /tmp/.mount_LyuKLU/chrome-sandbox is owned by root and has mode 4755.
Trace/breakpoint trap (core dumped)
```

按照提示, 最佳的解决方案应该是:

```bash
$ sudo chown root:root /tmp/.mount_LyuKLU/chrome-sandbox
$ sudo chmod 4755 /tmp/.mount_LyuKLU/chrome-sandbox
```

然而, 显然 `/tmp/.mount_LyuKLU` 是一个临时目录, 在程序运行结束后就被销毁掉了, 我们无法卡时机, 在文件被创建后, 被执行前修改其权限, 因此需要一些变通方案.

### 报错原因

通过查询资料, 得知这是 Ubuntu 24.04 为了增加安全性所改进的限制, 在 Ubuntu 24.04 发行说明中有提及: [Unprivileged user namespace restrictions](https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890#p-99950-unprivileged-user-namespace-restrictions). 文中提到: Ubuntu 内核现在限制了无特权用户命名空间的使用, 这影响系统上所有无特权和未限制的程序.

### 解决方案

对于此类问题, 解决方案基本有四种:

#### 修复文件权限 (不适用上文场景)

```bash
$ sudo chown root:root /path/to/chrome-sandbox
$ sudo chmod 4755 /path/to/chrome-sandbox
```

#### 使用 AppArmor 配置 (不适用上文场景)

根据[Ubuntu 24.04 发行说明](https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890#p-99950-unprivileged-user-namespace-restrictions)与 [AppArmor 文档](https://ubuntu.com/server/docs/security-apparmor),

AppArmor 新增了一个 unconfined 配置模式 / 标志, 该模式将配置指定为基本上像 AppArmor 的无限制模式, 其中应用程序不受限制, 并允许添加额外的权限, 例如 `userns,` 权限.

例如: 对于 chrome, 编辑 `/etc/apparmor.d/chrome` 配置文件如下:

```
abi <abi/4.0>,

include <tunables/global>

/opt/google/chrome/chrome flags=(unconfined) {
  userns,

  # Site-specific additions and overrides. See local/README for details.
  include if exists <local/chrome>
}
```

#### 使用 `--no-sandbox` 选项

最方便, 但不建议

直接使用 `--no-sandbox` 选项运行 AppImage:

```bash
$ ./my-electron-app.AppImage --no-sandbox
```

#### 关闭安全限制

关闭后, 会存在无特权用户命名空间功能的内核漏洞, 不建议

临时关闭:

```bash
$ sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
```

永久关闭:

```bash
$ echo "kernel.apparmor_restrict_unprivileged_userns=0" | sudo tee /etc/sysctl.d/60-apparmor-namespace.conf
$ sudo sysctl -p /etc/sysctl.d/60-apparmor-namespace.conf
```

---

参考资料:

https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890#p-99950-unprivileged-user-namespace-restrictions

https://github.com/electron/electron/issues/42510#issuecomment-2171583086

https://github.com/arduino/arduino-ide/issues/2429#issuecomment-2099775010