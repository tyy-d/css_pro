export type DesignType = "code" | "prompt";
export type DesignScope = "component" | "page";
export type Visibility = "draft" | "published" | "hidden";
export interface Asset {
  id: string;
  name: string;
  url: string;
  path?: string;
  kind: "screenshot" | "asset";
}
export interface Design {
  id: string;
  owner_id: string;
  creator: string;
  title: string;
  description: string;
  type: DesignType;
  scope: DesignScope;
  tags: string[];
  html: string;
  css: string;
  prompt: string;
  instructions: string;
  attribution: string;
  assets: Asset[];
  status: Visibility;
  created_at: string;
  updated_at: string;
  stars: number;
  sample?: boolean;
  tool?: string;
  license_accepted?: boolean;
}
export interface Viewer {
  id: string;
  name: string;
  admin?: boolean;
}
export interface Report {
  id: string;
  design_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  resolved: boolean;
}
export const TAGS = [
  "Minimal",
  "Editorial",
  "Brutalist",
  "Retro",
  "Playful",
  "Monochrome",
  "Glass",
  "Organic",
  "Dark",
  "Typography",
];
export const EMPTY_DESIGN: Omit<
  Design,
  "id" | "owner_id" | "creator" | "created_at" | "updated_at"
> = {
  title: "",
  description: "",
  type: "code",
  scope: "component",
  tags: [],
  html: "",
  css: "",
  prompt: "",
  instructions: "",
  attribution: "",
  assets: [],
  status: "draft",
  stars: 0,
};
