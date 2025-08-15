import Layout from "@/Components/Layout/Layout";
import { motion } from "framer-motion";

function Page404() {
  return (
    <Layout>
      <div className="flex items-center justify-center relative h-[60vh] flex-col gap-3">
        <h2>Ooops!</h2>
        <h1 className="text-4xl lg:text-6xl text-gray-800 dark:text-gray-200 font-bold z-10 text-center">
          404
        </h1>
        <p>The Page You'r Looking For Is Not Found</p>

        {/* Animated Circles */}
        <motion.div
          className="absolute w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 "
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{ top: "10%", left: "20%" }}
        />

        <motion.div
          className="absolute w-24 h-24 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{ bottom: "20%", right: "10%" }}
        />
      </div>
    </Layout>
  );
}

export default Page404;
