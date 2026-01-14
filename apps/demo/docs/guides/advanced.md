---
title: Advanced Usage
order: 2
tags:
  - advanced
---

# Advanced Usage

Learn about advanced features of the plugin.

## Custom Virtual Module ID

You can customize the virtual module ID:

```typescript
markdownPlugin({
  virtualModuleId: 'virtual:docs'
})
```

## HTML Conversion

Enable HTML conversion with:

```typescript
markdownPlugin({
  parseMarkdown: true
})
```
