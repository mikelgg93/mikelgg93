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

  let postImageBase64 = "";
  if (post.data.image) {
    try {
      if (post.data.image.startsWith("http")) {
        const response = await fetch(post.data.image);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = response.headers.get("content-type") || "image/jpeg";
        postImageBase64 = `data:${mime};base64,${buffer.toString("base64")}`;
      } else {
        const imagePathRaw = post.data.image.startsWith("/") ? post.data.image.slice(1) : post.data.image;
        const absoluteImagePath = path.resolve(process.cwd(), "public", imagePathRaw);
        const imageBuf = await fs.readFile(absoluteImagePath);
        const ext = path.extname(absoluteImagePath).toLowerCase().replace(".", "") || "png";
        const mime = ext === "jpg" ? "jpeg" : ext;
        postImageBase64 = `data:image/${mime};base64,${imageBuf.toString("base64")}`;
      }
    } catch (e) {
      console.error("Failed to load post image for OG:", e);
    }
  }

  // Load tiny avatar safely
  let avatarBase64 = "";
  try {
    const avatarPath = path.resolve(process.cwd(), "public", "hero-avatar.png");
    const avatarBuf = await fs.readFile(avatarPath);
    avatarBase64 = `data:image/png;base64,${avatarBuf.toString("base64")}`;
  } catch (e) {
    console.error("Failed to load avatar image for OG:", e);
  }

  const blogUrl = `mgg.contact/blog/${post.slug || post.id.replace('-es', '')}`;

  const markup = html`
    <div style="display: flex; width: 100%; height: 100%; position: relative; color: #ffffff; font-family: 'Inter'; overflow: hidden;">
      
      <img id="hero-image" style="position: absolute; top: -10px; left: -10px; width: 105%; height: 105%; object-fit: cover; filter: blur(6px); display: none;" />
      
      <div style="display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(to right, rgba(0, 26, 20, 0.85) 0%, rgba(0, 26, 20, 0.1) 100%);"></div>

      <div id="hero-fallback" style="display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #001a14; display: none;"></div>

      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 100%; height: 100%; padding: 80px; position: relative;">
        <div style="display: flex; flex-direction: column; max-width: 850px;">
          <h1 style="font-size: 56px; font-weight: 700; line-height: 1.1; margin-bottom: 24px; color: #f8fafc; text-shadow: 0px 4px 16px rgba(0,0,0,0.8);">
            ${post.data.title}
          </h1>
          <p style="font-size: 26px; font-weight: 400; color: #cbd5e1; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0px 2px 12px rgba(0,0,0,0.8);">
            ${post.data.description}
          </p>
        </div>
        <div style="display: flex; align-items: center; width: 100%;">
          <img id="avatar-image" style="width: 72px; height: 72px; border-radius: 50%; margin-right: 20px; object-fit: cover; display: none;" />
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 28px; font-weight: 700; color: #f8fafc; text-shadow: 0px 2px 8px rgba(0,0,0,0.6);">
              ${post.data.author || "Miguel García"}
            </span>
            <span style="font-size: 24px; color: #10b981; margin-top: 4px; text-shadow: 0px 2px 8px rgba(0,0,0,0.6);">
              ${blogUrl}
            </span>
          </div>
        </div>
      </div>

    </div>
  `;

  const findNode = (node: any, id: string): any => {
    if (node?.props?.id === id) return node;
    if (node?.props?.children) {
      const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
      for (const child of children) {
        if (child && typeof child === 'object') {
          const found = findNode(child, id);
          if (found) return found;
        }
      }
    }
    return null;
  };

  if (postImageBase64) {
    const imgNode = findNode(markup, "hero-image");
    if (imgNode) {
      imgNode.props.src = postImageBase64;
      imgNode.props.style = { ...imgNode.props.style, display: 'flex' };
    }
  } else {
    const fallbackNode = findNode(markup, "hero-fallback");
    if (fallbackNode) {
      fallbackNode.props.style = { ...fallbackNode.props.style, display: 'flex' };
    }
  }
  
  if (avatarBase64) {
    const avatarNode = findNode(markup, "avatar-image");
    if (avatarNode) {
      avatarNode.props.src = avatarBase64;
      avatarNode.props.style = { ...avatarNode.props.style, display: 'flex' };
    }
  }

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
