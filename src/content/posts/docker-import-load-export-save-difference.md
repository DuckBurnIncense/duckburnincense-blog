---
title: Docker import, load, export, save 的区别
published: 2025-11-07
description: '突击检查, 我知道你知道这些命令不一样, 但是具体哪里不一样?'
tags: ['Docker', '虚拟化']
category: '虚拟化'
---

我知道你知道这些命令不一样, 但你还记得哪里不一样吗?

- `docker import` / `docker export`: 导入导出 **container's filesystem** (容器的文件系统), 容器文件系统不包括原始镜像的任何元数据或配置信息.
  - 例如: `docker import /path/to/filesystem.tar your/filesystem`: 导入 `/path/to/filesystem.tar` 中的镜像到 docker 的 `your/filesystem`
  - 例如: `docker export -o /path/to/filesystem.tar your/filesystem`: 将 docker 中的 `your/filesystem` 导出到 `/path/to/filesystem.tar`
- `docker load` / `docker save`: 导入导出 **images** (镜像)
  - 例如: `docker load -i /path/to/image.tar`: 导入 `/path/to/image.tar` 中的镜像到 docker
  - 例如: `docker save -o /path/to/image.tar your/image:s`: 将 docker 中的 `your/image:s` 镜像导出到 `/path/to/image.tar`

下面给出 help

**docker import --help**

```
Usage:  docker import [OPTIONS] file|URL|- [REPOSITORY[:TAG]]

Import the contents from a tarball to create a filesystem image

Aliases:
  docker image import, docker import

Options:
  -c, --change list       Apply Dockerfile instruction to the created image
  -m, --message string    Set commit message for imported image
      --platform string   Set platform if server is multi-platform capable
```

**docker export --help**

```
Usage:  docker export [OPTIONS] CONTAINER

Export a container's filesystem as a tar archive

Aliases:
  docker container export, docker export

Options:
  -o, --output string   Write to a file, instead of STDOUT
```

**docker load --help**

```
Usage:  docker load [OPTIONS]

Load an image from a tar archive or STDIN

Aliases:
  docker image load, docker load

Options:
  -i, --input string   Read from tar archive file, instead of STDIN
  -q, --quiet          Suppress the load output
```

**docker save --help**

```
Usage:  docker save [OPTIONS] IMAGE [IMAGE...]

Save one or more images to a tar archive (streamed to STDOUT by default)

Aliases:
  docker image save, docker save

Options:
  -o, --output string   Write to a file, instead of STDOUT
```

---

我为啥突然要写这个文章? 因为我通过 `docker save` 导出了我制作的一个镜像, 然后拿到另一台机器上下意识地通过 `docker import` 导入, 然后镜像死活开不起来, 一直报错 `error response from daemon no command specified`. 于是我尝试 `docker run -it image /bin/bash`, 结果 bash 也没有, 随后试了 `sh` 等也不存在, 遂怀疑镜像传输过程中损坏, 但校验 sha256 发现并没有. 折腾了一晚上, 最后 `docker inspect image` 发现空荡荡的 (尤其是 entrypoint 也没有, 对应报错中的 `no command specified`), 才意识到可能是导入镜像做错了...