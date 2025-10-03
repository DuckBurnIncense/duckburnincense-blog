---
title: Carpet 通过命令获取 MC 服务器 MSPT 及 TPS 数据
published: 2025-10-03
tags: ['MC', '记录']
description: '通过 Fabric-Carpet 的 Scarpet 脚本获取 MC 服务器 MSPT 及 TPS 数据'
category: '记录'
license: CC BY 4.0
---

先定义两个函数

```
/script run mspt()->(for(last_tick_times(),tot_mspt+=_);tot_mspt/100);
/script run tps()->return(1000/mspt());
```

然后就可以获取数据了:

获取 MSPT:

```
/script run mspt()
```

获取 TPS:

```
/script run mspt()
```

说明: 此处的 TPS 为当前 MSPT 可承载的最大 TPS 数, 如当前 MSPT 为 1, 无 tick 加速. 此时获取的 TPS 并非 20, 而是 1000 / 1 = 1000.

参考资料:

[fabric-carpet#433](https://github.com/gnembon/fabric-carpet/issues/433#issuecomment-680843283)
