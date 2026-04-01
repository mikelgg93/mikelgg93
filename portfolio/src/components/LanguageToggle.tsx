import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function LanguageToggle() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    if (window.location.pathname.startsWith("/es")) {
      setLang("es");
    } else {
      setLang("en");
    }
  }, []);

  const toggleLang = () => {
    const newLang = lang === "en" ? "es" : "en";
    const currentPath = window.location.pathname;

    let newPath = currentPath;
    if (newLang === "es") {
      newPath = "/es" + currentPath;
    } else {
      newPath = currentPath.replace(/^\/es/, "");
      if (newPath === "") newPath = "/";
    }

    window.location.href = newPath;
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      className="font-bold"
    >
      {lang === "en" ? "ES" : "EN"}
    </Button>
  );
}
