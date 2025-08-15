import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function AboutUs() {
  return (
    <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
      <div className="md:w-1/2">
        <Image
          src="/about.png" // Replace with actual image path
          alt="About Us"
          width={500}
          height={400}
          className="rounded-lg"
        />
      </div>
      <div className="md:w-1/2 md:pl-8 mt-8 md:mt-0">
        <h2 className="text-3xl font-bold mb-4">Our Story</h2>
        <p className="text-text-secondary mb-4">
          We started with a simple mission: to provide high-quality products
          that make a difference. Today, we're proud to serve customers
          worldwide.
        </p>
        <Link href="/inside/about" className="text-blue-600 hover:underline">
          Learn More →
        </Link>
      </div>
    </div>
  );
}
