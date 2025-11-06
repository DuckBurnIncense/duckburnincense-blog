---
title: 二次打包 FunASR 官方镜像使其可一键运行
description: '官方 FunASR 镜像运行后会进入 bash, 需要再次输入命令才能运行. 二次打包 FunASR 官方镜像, 使其可直接运行, 无需再输命令'
published: 2025-11-07
category: 'Docker'
tags: ['FunASR', '虚拟化']
---

根据[官方文档](https://github.com/modelscope/FunASR/blob/main/runtime/docs/SDK_advanced_guide_online.md), FunASR 启动方式如下:

```sh
sudo docker pull registry.cn-hangzhou.aliyuncs.com/funasr_repo/funasr:funasr-runtime-sdk-online-cpu-0.1.13
mkdir -p ./funasr-runtime-resources/models
sudo docker run -p 10096:10095 -it --privileged=true \
  -v $PWD/funasr-runtime-resources/models:/workspace/models \
  registry.cn-hangzhou.aliyuncs.com/funasr_repo/funasr:funasr-runtime-sdk-online-cpu-0.1.13
```

运行后会进入容器的 bash, 需要再输入下面的命令:

```sh
cd FunASR/runtime
nohup bash run_server_2pass.sh \
  --download-model-dir /workspace/models \
  --vad-dir damo/speech_fsmn_vad_zh-cn-16k-common-onnx \
  --model-dir damo/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-onnx  \
  --online-model-dir damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online-onnx  \
  --punc-dir damo/punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727-onnx \
  --lm-dir damo/speech_ngram_lm_zh-cn-ai-wesp-fst \
  --itn-dir thuduj12/fst_itn_zh \
  --hotword /workspace/models/hotwords.txt > log.txt 2>&1 &
```

才能运行.

所以, 目标: 使其可通过 `docker compose up` 命令一键启动.

编写 `run.sh` 如下, 用于启动服务器:

```bash
#!/bin/bash

# 进入工作目录
cd /workspace/FunASR/runtime

# 后台运行服务 (自行调整你需要的参数)
nohup bash run_server_2pass.sh \
  --download-model-dir /workspace/models \
  --vad-dir damo/speech_fsmn_vad_zh-cn-16k-common-onnx \
  --model-dir damo/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-onnx  \
  --online-model-dir damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online-onnx  \
  --punc-dir damo/punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727-onnx \
  --lm-dir damo/speech_ngram_lm_zh-cn-ai-wesp-fst \
  --itn-dir thuduj12/fst_itn_zh \
  --hotword /workspace/models/hotwords.txt > log.txt 2>&1 &

# 输出日志
tail -f log.txt
```

编写 `Dockerfile` 如下:

```Dockerfile
# 引用基础镜像
FROM registry.cn-hangzhou.aliyuncs.com/funasr_repo/funasr:funasr-runtime-sdk-online-cpu-0.1.13
# 设置时区
ENV TZ=Asia/Shanghai
# 声明端口
EXPOSE 10095/tcp
# 复制刚才创建的用于启动服务器的文件
COPY run.sh /run.sh
# 给予执行权限
RUN chmod +x /run.sh
# 设置入口点
ENTRYPOINT ["/run.sh"]
```

构建镜像:

```sh
$ docker build . -t myfunasr:v1
```

编写 `docker-compose.yaml`:

```yaml
services:
  funasr:
    image: myfunasr:v1
    container_name: funasr
    restart: unless-stopped
    # 我也不知道为什么官方文档要 --privileged=true,
    # 我觉得过于不安全, 没加, 但也能跑. 因此加不加取决于你
    privileged: true
    ports:
      - 10096:10095
    volumes:
      - "./funasr-runtime-resources/models:/workspace/models"
```

`docker compose up -d`, enjoy it~

参考文章: https://www.cnblogs.com/shizidushu/p/18381237
