# README

## Project Overview

This is a personal website project built using [Astro](https://astro.build/). The frontend is built with a mix of Astro components and [React](https://react.dev/) components, and styled using [Tailwind CSS](https://tailwindcss.com/). The project uses [shadcn/ui](https://ui.shadcn.com/) for its component library. The project is configured with TypeScript for type safety and uses `bun` as the package manager.

The structure suggests a modern web application with a focus on component-based architecture. Key libraries in use include:

*   `@astrojs/react`: for integrating React components within the Astro project.
*   `tailwindcss`: for utility-first CSS styling.
*   `shadcn/ui`: for the component library, which uses Radix UI and Tailwind CSS.
*   `class-variance-authority` and `clsx`: for creating flexible and reusable UI components with different variants.
*   `lucide-react`: for icons.

## Building and Running

The following scripts are available in `package.json` to manage the development lifecycle:

*   **`bun run dev`**: Starts the development server with hot-reloading at `http://localhost:4321`.
*   **`bun run build`**: Builds the static site for production to the `dist/` directory.
*   **`bun run preview`**: Starts a local server to preview the production build.

## Publishing posts

Each post in `src/content/blog/` has a frontmatter flag:

```yaml
published: false
```

Set `published: true` when the article is ready. An omitted flag defaults to
`false`. English and Spanish files each have their own flag.

- `bun run build` includes only published posts in article routes, listings,
  navigation, social preview images and article source panels.
- `bun run dev` includes unpublished posts for editing.
- `bun run build:drafts`, then `bun run preview -- --host 0.0.0.0`, creates a
  shareable review build including drafts. Draft articles show an unpublished
  label and review pages request `noindex`. This replaces `dist/`; run the normal
  `bun run build` again before deploying the public site.

This controls publication of the article pages, not access to the public Git
repository or static assets. A review server shared through a tunnel includes drafts.

The slides at `/presentations/webgl-eye/` and their article links are preview-only:
they are included in development and draft builds, and omitted from normal
production builds even after Part III is published. `bun run build:presentation`
exports an offline copy to `local-previews/webgl-eye/standalone.html`, outside the
deployment directory. That local output is ignored by Git.

## Development Conventions

### Project Structure

*   **`src/pages`**: Contains the pages of the website. Each `.astro` file in this directory becomes a page.
*   **`src/components`**: Contains reusable components. React components (`.tsx`) are located in `src/components/ui` and are based on `shadcn/ui`.
*   **`src/layouts`**: Contains layout components that define the structure of pages.
*   **`src/styles`**: Contains global styles and Tailwind CSS configuration.
*   **`public`**: Contains static assets like images and fonts.

### Coding Style

*   **TypeScript**: The project uses TypeScript with strict mode enabled for robust type checking.
*   **Path Aliases**: The project is configured with path aliases in `tsconfig.json`, allowing for cleaner imports (e.g., `import { Button } from "@/components/ui/button"`).
*   **Styling**: Styling is primarily done using Tailwind CSS. The project also uses `class-variance-authority` to manage component style variants, which is a common pattern for building design systems and is used by `shadcn/ui`.
*   **Components**: The project uses a mix of Astro and React components. React components are used for interactive UI elements, as seen with the `client:load` directive in `src/pages/index.astro`. The UI components are from `shadcn/ui` and can be customized.
