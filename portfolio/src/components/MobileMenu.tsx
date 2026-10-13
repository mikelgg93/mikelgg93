import { Menu } from "lucide-react";
import { useState } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMobileMenuSwipe } from "@/hooks/useMobileMenuSwipe";

interface PostLink {
  title: string;
  url: string;
}

interface MobileMenuProps {
  homePath: string;
  blogPath: string;
  posts: PostLink[];
  isEs: boolean;
}

export default function MobileMenu({
  homePath,
  blogPath,
  posts,
  isEs,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  useMobileMenuSwipe(open, setOpen, blogPath);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="md:hidden text-primary dark:text-white p-2 focus:outline-none"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        data-mobile-menu
        aria-describedby={undefined}
        className="bg-transparent border-none flex flex-col w-[85vw] max-w-sm data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none [&>button]:top-[calc(6rem+env(safe-area-inset-top,0px)+0.5rem)] [&>button]:p-3"
      >
        <div className="absolute -inset-y-32 inset-x-0 bg-background/95 backdrop-blur-md border-l border-border/50 -z-10" />
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8 font-serif">
          <div className="flex flex-col gap-4">
            <a
              className="text-2xl font-bold text-foreground hover:text-primary transition-colors uppercase tracking-wider"
              href={homePath}
              onClick={() => setOpen(false)}
            >
              {isEs ? "Inicio" : "Home"}
            </a>
            <a
              className="text-2xl font-bold text-foreground hover:text-primary transition-colors uppercase tracking-wider"
              href={blogPath}
              onClick={() => setOpen(false)}
            >
              Blog
            </a>
          </div>

          {posts.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {isEs ? "Últimos Artículos" : "Latest Posts"}
              </h3>
              <div className="flex flex-col gap-4">
                {posts.map((post, idx) => (
                  <a
                    key={idx}
                    href={post.url}
                    onClick={() => setOpen(false)}
                    className="text-base text-foreground/80 hover:text-primary transition-colors leading-snug line-clamp-2"
                  >
                    {post.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 pt-6 mt-auto">
          <div className="flex gap-6 items-center">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
