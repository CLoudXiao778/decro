export type LyricLine = {
  time: number;
  text: string;
  translation?: string;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSec: number;
  palette: [string, string, string, string];
  lyrics: LyricLine[];
  liked?: boolean;
  quality?: "Hi-Res" | "SQ" | "HQ" | "标准";
  vip?: boolean;
  coverSeed?: number;
  coverUrl?: string;
  fee?: number;
};

export type Playlist = {
  id: string;
  title: string;
  subtitle: string;
  count: string;
  palette: [string, string, string, string];
  coverSeed?: number;
  kind?: "playlist" | "radio" | "daily" | "chart";
  description?: string;
  coverUrl?: string;
  creator?: string;
  playCount?: number;
  updateTime?: number;
  specialType?: number;
  trackCount?: number;
  tracks?: Track[];
};

const lyricA: LyricLine[] = [
  { time: 0, text: "霓虹在玻璃上慢慢融化", translation: "Neon is melting on the glass" },
  { time: 12, text: "我们沿着海岸线向北", translation: "We head north along the coastline" },
  { time: 26, text: "风把城市的回声吹得很远", translation: "The wind carries the city's echo far away" },
  { time: 41, text: "而你只是看着窗外", translation: "And you just look out the window" },
  { time: 55, text: "夜色像一条没有尽头的河", translation: "The night is a river without an end" },
  { time: 70, text: "我们在同一束光里失重", translation: "We lose gravity in the same beam of light" },
  { time: 86, text: "如果明天还会醒来", translation: "If we wake up tomorrow" },
  { time: 101, text: "请记得今晚的潮汐", translation: "Please remember tonight's tide" },
  { time: 118, text: "让所有未说出口的话", translation: "Let all the unspoken words" },
  { time: 133, text: "都沉入这片深蓝", translation: "Sink into this deep blue" },
];

const lyricB: LyricLine[] = [
  { time: 0, text: "We were dancing in the static light", translation: "我们在静电光里跳舞" },
  { time: 18, text: "Every shadow turned to gold tonight", translation: "今晚每一道影子都变成金色" },
  { time: 38, text: "Hold the moment like a fading photograph", translation: "把这一刻握成一张褪色的照片" },
  { time: 55, text: "We don't need a reason, we don't need a map", translation: "不需要理由，也不需要地图" },
  { time: 73, text: "Let the city burn a little slower", translation: "让城市慢一点燃烧" },
  { time: 92, text: "Let the night become our only color", translation: "让夜色成为我们唯一的颜色" },
  { time: 106, text: "If the morning finds us out of time", translation: "如果清晨发现我们已经没有时间" },
  { time: 121, text: "We'll leave a little light behind", translation: "我们会留下一小束光" },
];

export const tracks: Track[] = [
  {
    id: "t1",
    title: "夜航",
    artist: "Lumen",
    album: "Neon Tides",
    duration: "4:38",
    durationSec: 278,
    palette: ["#7a1f2b", "#ff5f4d", "#f0b15c", "#2a1020"],
    lyrics: lyricA,
    liked: true,
    quality: "Hi-Res",
    coverSeed: 0,
  },
  {
    id: "t2",
    title: "One More Time",
    artist: "Daft Punk",
    album: "Discovery",
    duration: "5:20",
    durationSec: 320,
    palette: ["#6d1d28", "#e74b43", "#e8a24c", "#2c1519"],
    lyrics: lyricB,
    liked: true,
    quality: "SQ",
    coverSeed: 1,
  },
  {
    id: "t3",
    title: "海岸线以北",
    artist: "冷杉",
    album: "潮汐来信",
    duration: "4:12",
    durationSec: 252,
    palette: ["#12304f", "#2b7a9c", "#9bd3ce", "#101b2a"],
    lyrics: lyricA,
    liked: false,
    quality: "HQ",
    coverSeed: 2,
  },
  {
    id: "t4",
    title: "缓慢下沉",
    artist: "Vela",
    album: "Blue Hour",
    duration: "5:06",
    durationSec: 306,
    palette: ["#2a1840", "#6c3d91", "#c1738a", "#150f22"],
    lyrics: lyricA,
    quality: "Hi-Res",
    coverSeed: 3,
  },
  {
    id: "t5",
    title: "金色时刻",
    artist: "Mira",
    album: "Golden Hour",
    duration: "3:48",
    durationSec: 228,
    palette: ["#3b3b1f", "#7d7a3a", "#d6b06d", "#19180e"],
    lyrics: lyricA,
    quality: "SQ",
    coverSeed: 4,
  },
  {
    id: "t6",
    title: "旧唱片店",
    artist: "City Pop Club",
    album: "Last Summer",
    duration: "4:51",
    durationSec: 291,
    palette: ["#2a2626", "#7c4b43", "#c79b7b", "#181313"],
    lyrics: lyricA,
    quality: "HQ",
    coverSeed: 5,
  },
  {
    id: "t7",
    title: "Plastic Love",
    artist: "竹内まりや",
    album: "Variety",
    duration: "4:51",
    durationSec: 291,
    palette: ["#6d5c2f", "#b68a4a", "#e0c786", "#241d12"],
    lyrics: lyricB,
    quality: "SQ",
    coverSeed: 6,
  },
  {
    id: "t8",
    title: "夜に駆ける",
    artist: "YOASOBI",
    album: "THE BOOK",
    duration: "4:21",
    durationSec: 261,
    palette: ["#143249", "#2e6d84", "#b5d5d1", "#0b1923"],
    lyrics: lyricB,
    quality: "Hi-Res",
    coverSeed: 7,
  },
  {
    id: "t9",
    title: "光年之外",
    artist: "G.E.M. 邓紫棋",
    album: "光年之外",
    duration: "3:55",
    durationSec: 235,
    palette: ["#4a1f45", "#8c3b64", "#e0a1a8", "#1c101d"],
    lyrics: lyricA,
    quality: "HQ",
    coverSeed: 8,
  },
  {
    id: "t10",
    title: "山海",
    artist: "草东没有派对",
    album: "丑奴儿",
    duration: "4:13",
    durationSec: 253,
    palette: ["#2c3036", "#5e6870", "#a9b4b8", "#14171a"],
    lyrics: lyricA,
    quality: "SQ",
    coverSeed: 9,
  },
];

export const playlists: Playlist[] = [
  {
    id: "p1",
    title: "城市夜行：合成器与霓虹的边界",
    subtitle: "Decro 编辑部 · 28 首",
    count: "28",
    palette: ["#6d1d28", "#ff5f4d", "#f0b15c", "#2a1020"],
    coverSeed: 0,
    kind: "playlist",
    description: "从 City Pop 到 Synthwave，沿着夜色把城市重新听一遍。",
  },
  {
    id: "p2",
    title: "Midnight Signals",
    subtitle: "Synthwave · 42 首",
    count: "42",
    palette: ["#4a1f45", "#8c3b64", "#e0a1a8", "#1c101d"],
    coverSeed: 1,
    kind: "playlist",
    description: "复古合成器、霓虹灯与午夜公路。",
  },
  {
    id: "p3",
    title: "海岸线以北",
    subtitle: "Indie · 36 首",
    count: "36",
    palette: ["#12304f", "#2b7a9c", "#9bd3ce", "#101b2a"],
    coverSeed: 2,
    kind: "playlist",
    description: "海风、慢拍吉他与一点失真的温柔。",
  },
  {
    id: "p4",
    title: "缓慢下沉",
    subtitle: "Ambient · 51 首",
    count: "51",
    palette: ["#2a1840", "#6c3d91", "#c1738a", "#150f22"],
    coverSeed: 3,
    kind: "playlist",
    description: "给深夜留一块不会被打扰的空间。",
  },
  {
    id: "p5",
    title: "金色时刻",
    subtitle: "Jazz · 29 首",
    count: "29",
    palette: ["#3b3b1f", "#7d7a3a", "#d6b06d", "#19180e"],
    coverSeed: 4,
    kind: "playlist",
    description: "黄昏、铜管与一杯没有喝完的酒。",
  },
  {
    id: "p6",
    title: "旧唱片店",
    subtitle: "City Pop · 64 首",
    count: "64",
    palette: ["#2a2626", "#7c4b43", "#c79b7b", "#181313"],
    coverSeed: 5,
    kind: "playlist",
    description: "翻出压箱底的塑料唱片，让夏天继续播放。",
  },
  {
    id: "p7",
    title: "私人雷达",
    subtitle: "根据你最近的循环生成",
    count: "30",
    palette: ["#143249", "#2e6d84", "#b5d5d1", "#0b1923"],
    coverSeed: 6,
    kind: "radio",
    description: "只有你能听见的频率。",
  },
  {
    id: "p8",
    title: "雨天合成器",
    subtitle: "Electronic · 31 首",
    count: "31",
    palette: ["#263546", "#5a7a8e", "#c2d2d9", "#101820"],
    coverSeed: 7,
    kind: "playlist",
    description: "窗外下雨的时候，把世界调成慢速。",
  },
  {
    id: "p9",
    title: "深夜写作",
    subtitle: "Focus · 46 首",
    count: "46",
    palette: ["#2b2a28", "#6d6052", "#c4a98a", "#161412"],
    coverSeed: 8,
    kind: "playlist",
    description: "低照度、低干扰，适合把想法写完。",
  },
];

export const charts: Playlist[] = [
  {
    id: "c1",
    title: "新歌飙升榜",
    subtitle: "每小时更新",
    count: "100",
    palette: ["#5b1c26", "#c4363f", "#eeb16d", "#231117"],
    kind: "chart",
  },
  {
    id: "c2",
    title: "热歌榜",
    subtitle: "每日更新",
    count: "200",
    palette: ["#1c3146", "#3d6b8a", "#b6d2db", "#0d1a24"],
    kind: "chart",
  },
  {
    id: "c3",
    title: "原创榜",
    subtitle: "每周更新",
    count: "100",
    palette: ["#2d2438", "#6d4d75", "#c8a6a9", "#17121c"],
    kind: "chart",
  },
];

export const hotSearches = [
  "夜航",
  "City Pop",
  "Daft Punk",
  "雨天",
  "华语新歌",
  "Ambient",
  "女声",
  "通勤",
  "90 年代",
  "纯音乐",
];

export const recentSearches = ["Midnight Signals", "宇多田ヒカル", "Jazz hiphop", "电影原声"];

export const audioQualities = ["标准", "较高", "极高", "无损", "Hi-Res"];

export const settingsSections = [
  {
    id: "appearance",
    title: "外观",
  },
  {
    id: "playback",
    title: "播放",
  },
  {
    id: "lyrics",
    title: "歌词",
  },
  {
    id: "storage",
    title: "存储",
  },
  {
    id: "shortcuts",
    title: "快捷键",
  },
  {
    id: "about",
    title: "关于",
  },
];
