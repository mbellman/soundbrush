const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const mode = process.env.npm_lifecycle_script?.includes('webpack-dev-server')
  ? 'development'
  : 'production';

module.exports = {
  devtool: false,
  mode,
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'main-[contenthash].js'
  },
  devServer: {
    open: true,
    port: 1234
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader'
      },
      {
        test: /.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html',
      inject: true
    })
  ],
  resolve: {
    extensions: ['.js', '.ts']
  }
};