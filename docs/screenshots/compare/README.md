# 进度条对照

| 文件 | 状态 |
|---|---|
| `source-paused-progress.png` | alpha42 真机暂停：已播段为直线 |
| `source-wave-progress.png` | alpha42 真机播放：已播段为波浪线，未播段为直线，thumb 为竖条 |
| `desktop-wave-progress.png` | 本仓库桌面播放态：波浪线持续流动；直线只从 thumb 右侧开始 |

实现位置：`src/components/FullPlayer.tsx` 的 `WaveProgress` + `src/styles/app.css` 的 `.wave-progress*`。
