declare module 'virtual:markdown' {
  const markdownData: {
  'README.md': {
    type: 'file';
    name: 'README';
    path: 'README.md';
    content: string;
    frontmatter: { title: string; author: string; published: boolean };
    body: string;
    html: string;
  };
  'api': {
    type: 'directory';
    name: 'api';
    path: 'api';
    children: {
    'reference.md': {
      type: 'file';
      name: 'reference';
      path: 'api/reference.md';
      content: string;
      frontmatter: { title: string; version: string };
      body: string;
      html: string;
    }
    };
  };
  'guides': {
    type: 'directory';
    name: 'guides';
    path: 'guides';
    children: {
    'advanced.md': {
      type: 'file';
      name: 'advanced';
      path: 'guides/advanced.md';
      content: string;
      frontmatter: { title: string; order: number; tags: string[] };
      body: string;
      html: string;
    };
    'getting-started.md': {
      type: 'file';
      name: 'getting-started';
      path: 'guides/getting-started.md';
      content: string;
      frontmatter: { title: string; order: number; tags: string[] };
      body: string;
      html: string;
    }
    };
  }
  };

  export default markdownData;
}
