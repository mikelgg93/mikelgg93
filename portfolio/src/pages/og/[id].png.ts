import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import fs from "fs/promises";
import path from "path";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  const ids = Array.from(new Set(posts.map(p => p.id.replace("-es", ""))));
  
  return ids.map(id => {
    const post = posts.find(p => p.id === id) || posts.find(p => p.id === `${id}-es`);
    return {
      params: { id },
      props: { post },
    };
  });
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: any };

  const interRegularPath = path.resolve(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff");
  const interBoldPath = path.resolve(process.cwd(), "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff");
  
  const interRegular = await fs.readFile(interRegularPath);
  const interBold = await fs.readFile(interBoldPath);

  const markup = html`
    <div style="display: flex; flex-direction: column; justify-content: space-between; width: 100%; height: 100%; background-color: #001a14; background-image: linear-gradient(135deg, #001a14 0%, #003328 100%); color: #ffffff; padding: 80px; font-family: 'Inter'; position: relative; overflow: hidden;">
      <div style="display: flex; flex-direction: column;">
        <h1 style="font-size: 72px; font-weight: 700; line-height: 1.1; margin-bottom: 24px; color: #f8fafc; max-width: 900px;">
          ${post.data.title}
        </h1>
        <p style="font-size: 32px; font-weight: 400; color: #94a3b8; line-height: 1.4; max-width: 850px;">
          ${post.data.description}
        </p>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 28px; font-weight: 700; color: #f8fafc;">
            ${post.data.author || "Miguel García"}
          </span>
          <span style="font-size: 24px; color: #10b981; margin-top: 4px;">
            mgg.contact
          </span>
        </div>
      </div>
    </div>
  `;

  const svg = await satori(
    markup,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
        { name: "Inter", data: interBold, weight: 700, style: "normal" },
      ],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
