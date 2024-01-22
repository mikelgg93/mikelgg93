"use client";
import Resume from "@/components/data/RESUME.json";
import { Separator } from "@radix-ui/react-menubar";
export default function Home() {
  return (
    <div className="w-[90%]">
      <h1 className="pl-1 mb-4 mt-4 font-semibold">About</h1>
      <Separator className="mt-2" />
      <p className="whitespace-pre-wrap pl-1 mb-4 mt-2 font-serif">
        {Resume.basics.about}
      </p>
      <Separator className="mt-2" />
      <div className="flex justify-center">{/* <Signature /> */}</div>
    </div>
  );
}
