import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function ShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        setIsOpen((prev) => !prev);
      }

      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-card border border-border/50 shadow-lg rounded-xl max-w-md w-full overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border/50">
          <h2 className="text-lg font-bold text-foreground font-serif">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">
              Toggle Theme
            </span>
            <div className="flex gap-1">
              <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
                ⌘
              </kbd>
              <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
                K
              </kbd>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">
              Toggle Language
            </span>
            <div className="flex gap-1">
              <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
                ⌘
              </kbd>
              <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
                J
              </kbd>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">
              Navigate to Blog
            </span>
            <div className="flex gap-1">
              <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
                ⌘
              </kbd>
              <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
                B
              </kbd>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-medium text-foreground">
              Show this menu
            </span>
            <kbd className="px-2 py-1 bg-muted rounded border border-border/50 text-xs font-mono">
              ?
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
