export type KnowledgeCrawlQueue = {
  id: string;
  name: string | null;
  url: string;
  status: string;
  depth: number;
  domain: string | null;
  depthZeroUrl: string | null;
  knowledgeToolId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
};

export type ExtendedCrawlQueue = KnowledgeCrawlQueue & {
  crawlData?: {
    markdownData: string;
  } | null;
};
