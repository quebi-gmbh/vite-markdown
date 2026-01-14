---
title: Getting Started
order: 1
tags:
  - beginner
  - setup
---

# Getting Started

This guide will help you get started with the plugin.

## Installation

```bash
npm install @quebi-gmbh/vite-plugin-markdown
```

## Configuration

Add the plugin to your `vite.config.ts`:

```typescript
import markdownPlugin from '@quebi-gmbh/vite-plugin-markdown';

export default {
  plugins: [markdownPlugin()]
};
```
