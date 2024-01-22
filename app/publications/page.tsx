"use client";
import CitationsChart from "@/components/citationsChart";
import Scholar from "@/components/data/citations.json";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Separator } from "@radix-ui/react-separator";
import Image from "next/image";
import Link from "next/link";

const PublicationsPage = () => {
  return (
    <div className="w-[90%] flex flex-col">
      <h1 className="pl-1 mb-4 mt-4 font-semibold">Publications</h1>
      <p className="pl-1 mb-4 font-serif">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
        velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
        occaecat cupidatat non proident, sunt in culpa qui officia deserunt
        mollit anim id est laborum
      </p>

      <div className="flex flex-col lg:flex-row">
        <Card className="p-2 max-w lg:w-[35%] h-[24rem] mb-5">
          <CitationsChart />
        </Card>
        <Separator orientation="vertical" className="mx-4 or" />
        <Carousel className="max-w lg:w-1/2 h-[24rem] mb-5">
          <CarouselContent className="-ml-1">
            {Scholar.articles.map((publication, index) => (
              <CarouselItem
                key={index}
                className="pl-1 md:basis-1/2 lg:basis-1/2"
              >
                <Card className="h-[24rem]">
                  <div className="flex flex-col h-[8rem] grayscale hover:filter-none mb-5">
                    <AspectRatio ratio={16 / 9}>
                      <Link href={publication.link}>
                        <Image
                          src={`${publication.image}`}
                          alt="Publication image"
                          fill
                          className="rounded-md object-cover"
                        />
                      </Link>
                    </AspectRatio>
                  </div>
                  <CardContent className="flex aspect-square justify-center pl-0 pt-5">
                    <Link href={publication.link} className="p-6 font-serif">
                      {publication.title}
                    </Link>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
};
export default PublicationsPage;
