export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  readingTimeMinutes: number;
};

export type BlogPost = BlogPostMeta & {
  body: string;
};
