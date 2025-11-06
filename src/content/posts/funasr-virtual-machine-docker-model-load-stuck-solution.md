---
title: 在虚拟机中的 Docker 运行 FunASR 时加载模型时一直卡住不动的解决方案
description: '在虚拟机中的 Docker 运行 FunASR 时加载模型时一直卡住不动的解决方案'
published: 2025-11-07
category: '虚拟化'
tags: ['FunASR', '故障排除', 'Docker', '虚拟化']
---

在一个 KUbuntu 物理机上测试 [FunASR](https://github.com/modelscope/FunASR) 通过后, 在另一台 Windows 电脑的 VMware 中运行了一个全新 KUbuntu 24.04 LTS, 安装 docker 后依据[官方文档](https://github.com/modelscope/FunASR/blob/main/runtime/docs/SDK_advanced_guide_online.md)运行, 最后卡在了

```
FunASR  | I20251107 00:52:19.264511    56 funasr-wss-server-2pass.cpp:555] SSL is closed!
FunASR  | I20251107 00:52:19.325332    56 fsmn-vad.cpp:58] Successfully load model from /workspace/models/damo/speech_fsmn_vad_zh-cn-16k-common-onnx/model_quant.onnx
FunASR  | I20251107 00:52:20.740871    56 paraformer.cpp:77] Successfully load model from /workspace/models/damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online-onnx/model_quant.onnx
FunASR  | I20251107 00:52:21.095985    56 paraformer.cpp:85] Successfully load model from /workspace/models/damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online-onnx/decoder_quant.onnx
FunASR  | I20251107 00:52:23.210389    56 paraformer.cpp:142] Successfully load model from /workspace/models/damo/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-onnx/model_quant.onnx
```

这里. 通过打开 VMware 的处理器虚拟化, 成功继续往下跑了一行:

```
FunASR  | I20251107 00:52:28.818928    56 paraformer.cpp:160] Successfully load lm file /workspace/models/damo/speech_ngram_lm_zh-cn-ai-wesp-fst/TLG.fst
```

随后又卡住了. 通过将虚拟机的内存从 4G 调整到 8G, 成功继续运行下去了:

```
FunASR  | I20251107 00:52:29.558418    56 ct-transformer-online.cpp:21] Successfully load model from /workspace/models/damo/punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727-onnx/model_quant.onnx
FunASR  | I20251107 00:52:29.671496    56 itn-processor.cpp:33] Successfully load model from /workspace/models/thuduj12/fst_itn_zh/zh_itn_tagger.fst
FunASR  | I20251107 00:52:29.672539    56 itn-processor.cpp:35] Successfully load model from /workspace/models/thuduj12/fst_itn_zh/zh_itn_verbalizer.fst
FunASR  | I20251107 00:52:29.672549    56 websocket-server-2pass.cpp:596] initAsr run check_and_clean_connection
FunASR  | I20251107 00:52:29.672608    56 websocket-server-2pass.cpp:599] initAsr run check_and_clean_connection finished
FunASR  | I20251107 00:52:29.672616    56 funasr-wss-server-2pass.cpp:571] decoder-thread-num: 12
FunASR  | I20251107 00:52:29.672619    56 funasr-wss-server-2pass.cpp:572] io-thread-num: 1
FunASR  | I20251107 00:52:29.672623    56 funasr-wss-server-2pass.cpp:573] model-thread-num: 1
FunASR  | I20251107 00:52:29.672626    56 funasr-wss-server-2pass.cpp:574] asr model init finished. listen on port:10095
```

因此, 故障原因就是内存不足. 增加虚拟机的内存即可解决.

GitHub 上有关于此问题的 issue, 但处于 open 状态: [modelscope/FunASR#2649](https://github.com/modelscope/FunASR/issues/2649)

(当时还以为是什么玄学问题, 物理机上能跑起来, 虚拟机里就不行 —— docker 可是以稳定著称的啊, 排查了一下午)
