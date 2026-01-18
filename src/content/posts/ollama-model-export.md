---
title: 离线迁移 Ollama 中的特定模型：导出为解压即可使用的 tar.gz 文件
description: '通过分析 Ollama 模型的 manifest 与 blobs 依赖关系, 实现单模型的精确导出, 并提供一键打包模型为 .tar.gz 供迁移的自动化脚本.'
published: 2026-01-19
category: 'Ollama'
tags: ['Ollama', 'AI']
---

我们经常希望在断网情况下迁移 Ollama 的模型文件, 网上能找到的方法通常都是直接复制粘贴整个 `OLLAMA_MODELS` 文件夹, 这固然可以, 但是会迁移 Ollama 里的所有模型. 当我们仅希望迁移其中某一个模型时, 这个方法就非常的不友好了, 一是文件过大, 过多, 迁移过程非常缓慢; 二是里面有很多我们并不需要的模型, 在迁移过后我们还得把他们删掉, 且若目标磁盘空间不足以容纳所有模型, 还会导致迁移失败.

进一步地, 网上就出现了通过 `ollama show --modelfile` 查询模型文件位置, 再迁移修改时间相近的文件的方法, 但此方法仍存在问题: 当多个模型同时依赖一个文件时, 就会导致新的模型依赖旧的文件, 此时再根据修改时间判断, 就会导致迁移不完全.

那么, Ollama 是怎么判断需要哪些文件的呢?

## 技术论证 & 手动传输示例

通过查阅 [Ollama 源代码](https://github.com/ollama/ollama/blob/main/server/modelpath.go)可知, Ollama 将模型分别存储在 OLLAMA_MODELS 下的 `blobs` 和 `manifests` 下, 其中 `manifests` 下按照 `registry/namespace/repo/tag` 存储模型的 manifest; `blobs` 下存储模型 layer 的二进制文件.

以迁移 `deepseek-r1:8b` 为例

让我们看看它的 manifest 里写了啥:

```bash
$ sudo cat $OLLAMA_MODELS/manifests/registry.ollama.ai/library/deepseek-r1/8b | jq
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
  "config": {
    "mediaType": "application/vnd.docker.container.image.v1+json",
    "digest": "sha256:f64cd5418e4b038ef90cf5fab6eb7ce6ae8f18909416822751d3b9fca827c2ab",
    "size": 487
  },
  "layers": [
    {
      "mediaType": "application/vnd.ollama.image.model",
      "digest": "sha256:e6a7edc1a4d7d9b2de136a221a57336b76316cfe53a252aeba814496c5ae439d",
      "size": 5225373760
    },
    {
      "mediaType": "application/vnd.ollama.image.template",
      "digest": "sha256:c5ad996bda6eed4df6e3b605a9869647624851ac248209d22fd5e2c0cc1121d3",
      "size": 556
    },
    {
      "mediaType": "application/vnd.ollama.image.license",
      "digest": "sha256:6e4c38e1172f42fdbff13edf9a7a017679fb82b0fde415a3e8b3c31c6ed4a4e4",
      "size": 1065
    },
    {
      "mediaType": "application/vnd.ollama.image.params",
      "digest": "sha256:ed8474dc73db8ca0d85c1958c91c3a444e13a469c2efb10cd777ca9baeaddcb7",
      "size": 179
    }
  ]
}
```

不难发现, JSON 中各`digest` 对应 `$OLLAMA_MODELS/blobs` 下各 `sha256-` 开头的文件. 不过其中 `config.digest` 最为可疑, 单独一个字段存着, 让我们看看里面是啥:

```bash
$ sudo cat /usr/share/ollama/.ollama/models/blobs/sha256-f64cd5418e4b038ef90cf5fab6eb7ce6ae8f18909416822751d3b9fca827c2ab | jq
{
  "model_format": "gguf",
  "model_family": "qwen3",
  "model_families": [
    "qwen3"
  ],
  "model_type": "8.2B",
  "file_type": "Q4_K_M",
  "architecture": "amd64",
  "os": "linux",
  "rootfs": {
    "type": "layers",
    "diff_ids": [
      "sha256:e6a7edc1a4d7d9b2de136a221a57336b76316cfe53a252aeba814496c5ae439d",
      "sha256:c5ad996bda6eed4df6e3b605a9869647624851ac248209d22fd5e2c0cc1121d3",
      "sha256:6e4c38e1172f42fdbff13edf9a7a017679fb82b0fde415a3e8b3c31c6ed4a4e4",
      "sha256:ed8474dc73db8ca0d85c1958c91c3a444e13a469c2efb10cd777ca9baeaddcb7"
    ]
  }
}
```

看起来像是描述模型用的, 且下面的 `rootfs.diff_ids` 内容与 `layers[].digest` 完全一致, 不需要额外处理.

那就好办了, 在当前 Ollama 的实现下, 只需要把 manifest 里有的 digest 全部迁移, 就能跑了:

```bash
scp $OLLAMA_MODELS/blobs/sha256-f64cd5418e4b038ef90cf5fab6eb7ce6ae8f18909416822751d3b9fca827c2ab root@another-server:/path/to/OLLAMA_MODELS/blobs/
scp $OLLAMA_MODELS/blobs/sha256-e6a7edc1a4d7d9b2de136a221a57336b76316cfe53a252aeba814496c5ae439d root@another-server:/path/to/OLLAMA_MODELS/blobs/
scp $OLLAMA_MODELS/blobs/sha256-c5ad996bda6eed4df6e3b605a9869647624851ac248209d22fd5e2c0cc1121d3 root@another-server:/path/to/OLLAMA_MODELS/blobs/
scp $OLLAMA_MODELS/blobs/sha256-6e4c38e1172f42fdbff13edf9a7a017679fb82b0fde415a3e8b3c31c6ed4a4e4 root@another-server:/path/to/OLLAMA_MODELS/blobs/
scp $OLLAMA_MODELS/blobs/sha256-ed8474dc73db8ca0d85c1958c91c3a444e13a469c2efb10cd777ca9baeaddcb7 root@another-server:/path/to/OLLAMA_MODELS/blobs/
```

别忘了还有 manifest 本身:

```bash
scp $OLLAMA_MODELS/manifests/registry.ollama.ai/library/deepseek-r1/8b root@another-server:/path/to/OLLAMA_MODELS/manifests/registry.ollama.ai/library/deepseek-r1/
```

接下来到目标服务器

确认一下传输是否成功:

```bash
$ ollama pull deepseek-r1:8b
pulling manifest 
pulling e6a7edc1a4d7: 100% ▕█████████████████████████████████▏ 5.2 GB                         
pulling c5ad996bda6e: 100% ▕█████████████████████████████████▏  556 B                         
pulling 6e4c38e1172f: 100% ▕█████████████████████████████████▏ 1.1 KB                         
pulling ed8474dc73db: 100% ▕█████████████████████████████████▏  179 B                         
pulling f64cd5418e4b: 100% ▕█████████████████████████████████▏  487 B                         
verifying sha256 digest 
writing manifest 
success 
```

pull 应该瞬间完成, 虽然 CLI 仍会显示 pulling 进度, 但如果 blobs 已存在, 实际不会发生网络下载.

看看新模型, 应该已经在列表里了:

```bash
$ ollama list
NAME                                           ID              SIZE      MODIFIED      
deepseek-r1:8b                                 6995872bfe4c    5.2 GB    6 seconds ago    
```

直接 run, 也能跑得起来, 证明迁移成功:

```bash
$ ollama run deepseek-r1:8b
>>> Send a message (/? for help)
```

但是你要是说: 主播主播, 一个个手动复制粘贴 sha256, 再 scp 还是太吃操作了, 有没有更简便一点的操作?

## 自动传输

有的兄弟有的, 我也嫌麻烦, 于是写了个脚本:

**开源仓库链接**：
👉 [https://github.com/DuckBurnIncense/ollama-model-exporter.sh](https://github.com/DuckBurnIncense/ollama-model-exporter.sh)

这个脚本可以**全自动**帮你处理好上述过程，给你打包一个**能够直接传过去、解压就能用**的 `tar.gz` 文件。

### 使用方法:

#### 1. 安装依赖

脚本依赖以下工具, 请确保已安装:

- `bash >= 4`
- `curl`
- `jq`
- `tar`

如果不会装, 请看开源仓库的 README

#### 2. 下载脚本

```bash
$ curl -O https://raw.githubusercontent.com/DuckBurnIncense/ollama-model-exporter.sh/refs/heads/master/ollama-model-exporter.sh
$ chmod +x ollama-model-exporter.sh
```

#### 3. 导出模型为 tar.gz

```bash
sudo ./ollama-model-exporter.sh deepseek-r1:8b ./deepseek-r1-8b.tar.gz
```

执行完成后, 会生成一个结构**完全符合 Ollama 官方目录布局**的压缩包.

如果你只是想看看脚本会打包哪些文件，可以使用 dry-run：

```bash
sudo ./ollama-model-exporter.sh --dry-run deepseek-r1:8b ./deepseek-r1-8b.tar.gz
```

#### 4. 在目标服务器恢复模型

在目标服务器上, 确认 `OLLAMA_MODELS` 目录 (通常是下面两个之一):

```text
/usr/share/ollama/.ollama/models
~/.ollama/models
```

如果不是, 那就自行确认吧, 一般在 ollama.service 文件的环境变量里会写

然后直接解压:

```bash
tar -xzf ./deepseek-r1-8b.tar.gz -C /usr/share/ollama/.ollama/models
```

注意: **一定要解压到 `OLLAMA_MODELS` 目录本身, 而不是它的父目录!**

---

#### 5. 验证模型是否可用

```bash
ollama pull deepseek-r1:8b
```

如果 blobs 已存在, 这一步会非常快, 主要是校验 manifest.

然后:

```bash
ollama list
ollama run deepseek-r1:8b
```

能正常跑起来, 就说明迁移成功

#### 核心原理

这个脚本的核心思路其实非常简单, 本质就是**把 Ollama 自己 "认为是一个模型的最小集合" 精确地打包出来**.

总结下来就是 5 步:

1. **调用 Ollama HTTP API**

  ```text
  http://localhost:11434/api/show
  ```

  判断模型是否存在, 并获取 `modelfile`

2. **从 modelfile 中解析 `FROM /path/to/blobs/sha256-*`**

  - 由此反推出 `OLLAMA_MODELS` 根目录
  - 不依赖硬编码路径, 适配系统安装与用户安装

3. **定位模型 manifest**

  ```text
  manifests/registry.ollama.ai/<namespace>/<repo>/<tag>
  ```

4. **解析 manifest**

  - 读取 `config.digest`
  - 读取 `layers[].digest`
  - 得到模型真正依赖的全部 `sha256`

5. **只打包必要文件**

  - `manifests/.../<tag>`
  - `blobs/sha256-*`
  - 使用 `tar -C "$OLLAMA_MODELS"` 压缩所有需要的文件

最终得到的 `tar.gz`：

- 不多
- 不少
- 不包含无关模型
- 不依赖修改时间
- 可直接解压复用

## 总结

如果你只是想**整机备份**, 直接复制整个 `OLLAMA_MODELS` 当然没问题;
但如果你像我一样, 只想**精确迁移某一个模型**, 尤其是在:

- 离线环境
- 带宽有限, 重新 pull 很慢
- 模型很多

的情况下，这种基于 **manifest 精确依赖分析** 的方式, 会靠谱得多

希望这篇文章能帮你少浪费点时间

(脚本有问题欢迎提 Issue, (我应该没写 bug 吧...?))
