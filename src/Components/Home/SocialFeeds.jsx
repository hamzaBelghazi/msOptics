"use client";

import { motion } from "framer-motion";
import { Visibility, Instagram } from "@mui/icons-material";

const SocialFeeds = () => {
  // Sample Instagram posts - replace with your actual data
  const instagramPosts = [
    {
      id: 1,
      image: "/images/insta1.jpg",
      link: "https://instagram.com/post1",
    },
    {
      id: 2,
      image: "/images/insta2.jpg",
      link: "https://instagram.com/post2",
    },
    {
      id: 3,
      image: "/images/insta3.jpg",
      link: "https://instagram.com/post3",
    },
    {
      id: 4,
      image: "/images/insta4.jpg",
      link: "https://instagram.com/post4",
    },
  ];

  return (
    <div className="py-8">
      {" "}
      {/* Instagram Follow Button */}
      <div className="text-center mb-8">
        <motion.a
          href="https://instagram.com/your-handle"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full hover:shadow-lg transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Instagram className="w-5 h-5" />
          <span>Follow us on Instagram</span>
        </motion.a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {instagramPosts.map((post) => (
          <motion.a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group aspect-square overflow-hidden rounded-lg"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {/* Post Image */}
            <img
              src={post.image}
              alt="Instagram post"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-white">
                <Visibility className="w-6 h-6" />
                <Instagram className="w-6 h-6" />
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
};

export default SocialFeeds;
