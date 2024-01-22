"use client";
import Signature from "@/components/signature";
import { useEffect, useState } from "react";

const Loader = () => (
  <div className="fixed top-0 left-0 w-screen h-screen z-[99999999999999] flex items-center justify-center bg-background">
    <Signature />
  </div>
);

export default function RouteLoader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return loading ? <Loader /> : null;
}
