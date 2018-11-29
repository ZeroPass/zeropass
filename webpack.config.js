const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
   entry: path.resolve(__dirname, 'src', 'index.jsx'),
   output: {
      path: path.resolve(__dirname, 'output'),
      filename: 'bundle.js'
   },
   resolve: {
      extensions: ['.js', '.jsx']
   },
   module: {
      rules: [
         {
             test: /\.jsx/,
             exclude: /node_modules/,
             use: {
                loader: 'babel-loader',
                options: { presets: ['react', 'es2015'] }
             }
         },
         {
            test: /\.scss/,
            use: ['style-loader', 'css-loader', 'sass-loader']
         }
      ]
   },
   devServer: {
      https: true,
      contentBase: './src',
      publicPath: '/output'
   },
   plugins: [
     new HtmlWebpackPlugin({
        template: 'src/index.html'
     })
   ]
};