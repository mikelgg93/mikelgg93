import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";

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

  const markup = {
    type: "div",
    props: {
      style: { display: "flex", width: "100%", height: "100%", position: "relative", color: "#ffffff", fontFamily: "Inter", overflow: "hidden" },
      children: [
        postImageBase64 ? {
          type: "img",
          props: {
            src: postImageBase64,
            style: { position: "absolute", top: "-10px", left: "-10px", width: "105%", height: "105%", objectFit: "cover", filter: "blur(6px)", display: "flex" }
          }
        } : {
          type: "div",
          props: {
            style: { display: "flex", position: "absolute", top: "0", left: "0", width: "100%", height: "100%", backgroundColor: "#001a14" }
          }
        },
        {
          type: "div",
          props: {
            style: { display: "flex", position: "absolute", top: "0", left: "0", width: "100%", height: "100%", backgroundImage: "linear-gradient(to right, rgba(0, 26, 20, 0.85) 0%, rgba(0, 26, 20, 0.1) 100%)" }
          }
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "80px", position: "relative" },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", maxWidth: "850px" },
                  children: [
                    {
                      type: "h1",
                      props: {
                        style: { fontSize: "56px", fontWeight: 700, lineHeight: 1.1, marginBottom: "24px", color: "#f8fafc", textShadow: "0px 4px 16px rgba(0,0,0,0.8)" },
                        children: post.data.title
                      }
                    },
                    {
                      type: "p",
                      props: {
                        style: { fontSize: "26px", fontWeight: 400, color: "#cbd5e1", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "0px 2px 12px rgba(0,0,0,0.8)" },
                        children: post.data.description
                      }
                    }
                  ]
                }
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", width: "100%" },
                  children: [
                    avatarBase64 ? {
                      type: "img",
                      props: {
                        src: avatarBase64,
                        style: { width: "72px", height: "72px", borderRadius: "50%", marginRight: "20px", objectFit: "cover", display: "flex" }
                      }
                    } : null,
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", flexDirection: "column" },
                        children: [
                          {
                            type: "span",
                            props: {
                              style: { fontSize: "28px", fontWeight: 700, color: "#f8fafc", textShadow: "0px 2px 8px rgba(0,0,0,0.6)" },
                              children: post.data.author || "Miguel García"
                            }
                          },
                          {
                            type: "span",
                            props: {
                              style: { fontSize: "24px", color: "#10b981", marginTop: "4px", textShadow: "0px 2px 8px rgba(0,0,0,0.6)" },
                              children: blogUrl
                            }
                          }
                        ]
                      }
                    }
                  ].filter(Boolean)
                }
              }
            ]
          }
        }
      ]
    }
  };

  const svg = await satori(
    markup as any,
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
