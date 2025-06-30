export interface CrawlerAuthInfo {
  urls: string[];
  maxDepth: number;
  pathPatterns: string[];
  enableSitemapDiscovery?: boolean;
}

export interface GitHubAuthInfo {
  GITHUB_TOKEN: string;
  GITHUB_ORGANIZATION_NAME: string;
  members: {
    name: string;
    username: string;
  }[];
}

export interface NotionAuthInfo {
  NOTION_INTERNAL_INTEGRATION_SECRET: string;
}

export interface SlackAuthInfo {
  SLACK_API_TOKEN: string;
  channels: string[];
}

export interface CustomAuthInfo {
  [key: string]: unknown;
}

export type AuthInfo = 
  | CrawlerAuthInfo 
  | GitHubAuthInfo 
  | NotionAuthInfo 
  | SlackAuthInfo 
  | CustomAuthInfo;
