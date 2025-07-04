module.exports = {
  plugins: [
    'gatsby-plugin-postcss',
    'gatsby-plugin-emotion',
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: '编码助手',
        short_name: '编码助手',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        display: 'standalone',
        icon: 'src/images/icon.png',
      },
    },
  ],
} 