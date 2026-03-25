import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const dynamicRouteValues = {
  familyId: 'family-001',
  studentId: 'student-001',
  submissionId: 'submission-001',
  teacherId: 'teacher-001',
};

export function buildRouteInventory(repoRoot) {
  const pageDir = path.join(repoRoot, 'apps/web/src/app');
  const routes = collectPageRoutes(pageDir);
  const businessRoutes = routes.filter((route) => route !== '/' && route !== '/login');
  return {
    pageDir,
    routeCount: routes.length,
    businessRouteCount: businessRoutes.length,
    routes,
    businessRoutes,
    dynamicRoutes: routes.filter((route) => Object.values(dynamicRouteValues).some((value) => route.includes(value))),
  };
}

export function collectPageRoutes(root) {
  const routes = [];
  walk(root, (file) => {
    if (!file.endsWith(`${path.sep}page.tsx`)) return;
    const relativeDir = path.relative(root, path.dirname(file));
    const segments = relativeDir
      .split(path.sep)
      .filter(Boolean)
      .filter((segment) => !/^\(.*\)$/.test(segment));
    const route = '/' + segments.map((segment) => {
      const match = /^\[(.+)\]$/.exec(segment);
      if (!match) return segment;
      const key = match[1];
      const value = dynamicRouteValues[key];
      if (!value) throw new Error(`missing dynamic route value for ${key}`);
      return value;
    }).join('/');
    routes.push(route === '/' ? '/' : route.replace(/\/+/g, '/'));
  });
  return routes.sort();
}

export function collectResponsiveMetrics(repoRoot) {
  const cssPath = path.join(repoRoot, 'apps/web/src/app/globals.css');
  const cssText = readFileSync(cssPath, 'utf8');
  const declarations = cssText
    .split('\n')
    .map((line, index) => {
      const match = line.match(/\b(width|min-width|max-width)\s*:\s*([^;]+);/);
      if (!match) return null;
      return {
        line: index + 1,
        property: match[1],
        value: match[2].trim(),
        pxValues: extractPxValues(match[2]),
      };
    })
    .filter(Boolean);

  const mediaQueryMaxWidths = [...cssText.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)].map((match) => Number(match[1]));

  return {
    cssPath,
    mediaQueryMaxWidths,
    declarations,
  };
}

function extractPxValues(value) {
  return [...String(value).matchAll(/(\d+)px/g)].map((match) => Number(match[1]));
}

function walk(dir, visit) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, visit);
      continue;
    }
    visit(fullPath);
  }
}
