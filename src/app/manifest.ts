import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "鸣潮台词库 · WuWa Dialogue Stats",
    short_name: "鸣潮台词",
    description: "鸣潮角色台词统计、主线登场、伴星活动支线台词与词云分析",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#18181b",
    lang: "zh-CN",
    icons: [],
  };
}
