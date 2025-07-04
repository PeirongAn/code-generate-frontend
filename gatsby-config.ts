import type { GatsbyConfig } from "gatsby"
import fs from "fs"

const envFile = `.env.${process.env.NODE_ENV}`

fs.access(envFile, fs.constants.F_OK, (err) => {
  if (err) {
    console.warn(`File '${envFile}' is missing. Using default values.`)
  }
})

require("dotenv").config({
  path: envFile,
})

const config: GatsbyConfig = {
  pathPrefix: process.env.PREFIX_PATH_VALUE || "",
  siteMetadata: {
    title: `编码助手`,
    description: `一个智能、现代的中文编程与AI对话平台`,
    siteUrl: `http://localhost:8000`,
  },
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-postcss",
    "gatsby-plugin-image",
    "gatsby-plugin-sitemap",
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        icon: "src/images/icon.png",
      },
    },
    "gatsby-plugin-mdx",
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: "./src/images/",
      },
      __key: "images",
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "pages",
        path: "./src/pages/",
      },
      __key: "pages",
    },
  ],
}

export default config 