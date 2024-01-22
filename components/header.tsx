"use client";
import Resume from "@/components/data/RESUME.json";
import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Separator } from "@/components/ui/separator";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGithub,
  faGoogleScholar,
  faLinkedin,
  faOrcid,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import {
  faAt,
  faLocationDot,
  faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import profilePic from "./images/mgg.webp";

interface SocialProfile {
  network: string;
  url: string;
}
interface SocialButtonsProps {
  profiles: SocialProfile[];
}

const iconMap: { [key: string]: IconDefinition } = {
  email: faAt,
  telephone: faPhone,
  github: faGithub,
  scholar: faGoogleScholar,
  linkedin: faLinkedin,
  orcid: faOrcid,
  twitter: faXTwitter,
};
const navigationItems = [
  { label: "About", href: "/" },
  { label: "Publications", href: "/publications" },
  { label: "Projects", href: "/projects" },
  { label: "Experience", href: "/experience" },
  { label: "Education", href: "/education" },
  { label: "Contact", href: "/contact" },
];

const SocialButtons: React.FC<SocialButtonsProps> = ({ profiles }) => {
  return (
    <>
      {profiles.map((social) => {
        var network = social.network.toLowerCase();
        const Icon = iconMap[network];
        return (
          <Button
            key={network}
            className={`mr-2 h-7 w-7 group hover:border-${network}`}
            variant="social"
            size="icon"
            asChild
          >
            <a href={social.url}>
              <FontAwesomeIcon
                icon={Icon}
                className={`h-4 w-4 font-light group-hover:text-${network}`}
              />
            </a>
          </Button>
        );
      })}
    </>
  );
};

export const Header: React.FC = () => {
  const currentPath = usePathname();
  const getActiveItem = () => {
    const activeItem = navigationItems.find(
      (item) => item.href === currentPath
    );
    return activeItem ? activeItem.label : "Menu";
  };

  return (
    <div className="flex flex-col w-[90%] mt-2">
      <Separator className="mt-2" />
      <div className="flex flex-row">
        {/* Image */}
        {/* <AspectRatio ratio={1 / 1}> */}
        <Image
          src={profilePic}
          alt=""
          width="512"
          height="512"
          className="w-24 h-24 md:w-1/6 md:h-auto md:rounded-none rounded-full mx-auto my-auto"
        />
        {/* </AspectRatio> */}
        <Separator orientation="vertical" className="mr-4" />
        <div className="w-3/4">
          {/* Name */}
          <h1 className="mt-3 text-xl font-semibold tracking-tight transition-colors">
            {Resume.basics.name}
          </h1>
          <Separator className="my-2" />
          {/* Summary */}
          <h2 className="leading-7 mt-3">{Resume.basics.summary}</h2>
          <div className="space-y-4">
            {/* Location */}
            <p className="max-w-md items-center text-pretty mt-2 text-xs">
              <a
                className="inline-flex gap-x-1.5 align-baseline leading-none hover:underline"
                href={Resume.basics.location.link}
                target="_blank"
              >
                <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3" />
                {Resume.basics.location.city},{" "}
                {Resume.basics.location.countryCode} (
                {Resume.basics.location.timezone})
              </a>
            </p>
          </div>
          {/* Buttons */}
          <div className="flex flex-row text-sm items-center justify-left mt-5 -ml-1">
            <SocialButtons profiles={Resume.basics.profiles} />
          </div>
        </div>
      </div>
      <Separator className="my-4" />

      {/* DropDown for Mobile */}
      <nav className="md:hidden">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>{getActiveItem()}</MenubarTrigger>
            <MenubarContent>
              {navigationItems.map((item, index) => (
                <React.Fragment key={item.label}>
                  <MenubarItem className="hover:bg-lava hover:text-background">
                    <Link
                      href={item.href}
                      className={item.href === currentPath ? "text-lava" : " "}
                    >
                      {item.label}
                    </Link>
                  </MenubarItem>
                  {index < navigationItems.length - 1 && <MenubarSeparator />}
                </React.Fragment>
              ))}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </nav>

      {/* Horizontal Menu for Desktop */}
      <nav className="hidden md:flex h-5 items-center space-x-4 text-sm">
        {navigationItems.map((item, index) => (
          <React.Fragment key={item.label}>
            <Button
              variant="link_hover"
              asChild
              className={item.href === currentPath ? "text-lava" : " "}
            >
              <Link href={item.href} className="text-2xl">
                {item.label}
              </Link>
            </Button>
            {index < navigationItems.length - 1 && (
              <Separator orientation="vertical" />
            )}
          </React.Fragment>
        ))}
      </nav>
      <Separator className="my-4" />
    </div>
  );
};
