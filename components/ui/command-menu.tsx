"use client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { Moon, Printer, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

interface Props {
  links: { url: string; title: string }[];
}

export const CommandMenu = ({ links }: Props) => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { theme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = React.useState(theme === "dark");
  const [isBlindMode, setIsBlindMode] = React.useState(theme === "blind");

  React.useEffect(() => {
    setIsDarkMode(theme === "dark");
  }, [theme]);
  React.useEffect(() => {
    setIsBlindMode(theme === "blind");
  }, [theme]);
  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };
  const toggleBlind = () => {
    setTheme(isBlindMode ? "not_blind" : "blind");
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              toggleBlind();
            }}
          >
            {isBlindMode ? (
              <EyeClosedIcon className="mr-2 h-4 w-4" />
            ) : (
              <EyeOpenIcon className="mr-2 h-4 w-4" />
            )}
            <span>Blind</span>
            <CommandShortcut>⌘B</CommandShortcut>
            {/* <span><FontAwesomeIcon icon={faEyeSlash} /> Blind Mode</span> */}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              toggleTheme();
            }}
          >
            {" "}
            {isDarkMode ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : (
              <Sun className="mr-2 h-4 w-4" />
            )}
            <span>Theme</span>
            <CommandShortcut></CommandShortcut>
            {/* <span><FontAwesomeIcon icon={faMoon}/> Dark Mode</span> */}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              window.print();
            }}
          >
            <Printer className="mr-2 h-4 w-4" />
            <span>Print</span>
            <CommandShortcut>⌘P</CommandShortcut>
            {/* <span> <FontAwesomeIcon icon={faPrint} /> Print</span> */}
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Links">
          {links.map(({ url, title }) => (
            <CommandItem
              key={url}
              onSelect={() => {
                setOpen(false);
                window.open(url, "_blank");
              }}
            >
              <span>{title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </CommandDialog>
  );
};
