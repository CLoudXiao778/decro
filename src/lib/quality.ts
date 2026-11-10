export type QualityLevel =
  | "auto"
  | "standard"
  | "higher"
  | "exhigh"
  | "lossless"
  | "hires";

export const qualityOptions: { value: QualityLevel; label: string; hint: string }[] = [
  { value: "auto", label: "自动", hint: "按歌曲标称音质" },
  { value: "standard", label: "标准", hint: "128 kbps" },
  { value: "higher", label: "较高", hint: "192 kbps" },
  { value: "exhigh", label: "极高", hint: "320 kbps" },
  { value: "lossless", label: "无损", hint: "FLAC" },
  { value: "hires", label: "Hi-Res", hint: "高解析度" },
];

export function qualityLabel(value: QualityLevel): string {
  return qualityOptions.find((option) => option.value === value)?.label ?? "自动";
}

export function isQualityLevel(value: string): value is QualityLevel {
  return qualityOptions.some((option) => option.value === value);
}
