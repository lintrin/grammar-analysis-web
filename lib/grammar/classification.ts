import type { Aspect, Tense, Voice } from "./protocol.ts";

export function tenseLabel(tense: Tense, aspect: Aspect): string {
  if (tense === null || aspect === null) return "时态待确定";
  const time = tense === "past" ? "过去" : "现在";
  return aspect === "simple" ? `一般${time}时` : `${time}${{ progressive: "进行", perfect: "完成", "perfect-progressive": "完成进行" }[aspect]}时`;
}
export function voiceLabel(voice: Voice): string {
  return voice === "passive" ? "被动语态" : voice === "active" ? "主动语态" : "语态待确定";
}
