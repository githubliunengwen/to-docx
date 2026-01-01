/**
 * Taro Configuration
 */
export default {
  projectName: 'to-docx-frontend',
  date: '2024-01-01',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2 / 1
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  defineConstants: {
  },
  copy: {
    patterns: [
    ],
    options: {
    }
  },
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: { enable: false }
  },
  cache: {
    enable: false
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {

        }
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },
  h5: {
    publicPath: './',
    staticDirectory: 'static',
    output: {
      filename: 'js/[name].[hash:8].js',
      chunkFilename: 'js/[name].[chunkhash:8].js'
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
      filename: 'css/[name].[hash:8].css',
      chunkFilename: 'css/[name].[chunkhash:8].css'
    },
    postcss: {
      autoprefixer: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    },
    webpackChain(chain) {
      chain.merge({
        optimization: {
          splitChunks: {
            chunks: 'all',
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
              common: {
                name: 'common',
                minChunks: 2,
                priority: 1
              },
              vendors: {
                name: 'vendors',
                minChunks: 2,
                test: /[\\/]node_modules[\\/]/,
                priority: 10
              }
            }
          }
        }
      })

      // 隐藏第三方库的警告
      chain.plugin('webpack-filter-warnings').use(require('webpack').IgnorePlugin, [{
        checkResource: (_resource) => {
          // 忽略 @tarojs/components 的 webpackExports 警告
          return false;
        }
      }])
    },
    devServer: {
      host: 'localhost',
      port: 20000,
      hot: true,
      open: false,
      client: {
        overlay: {
          errors: true,
          warnings: false  // 隐藏警告弹窗
        }
      }
    }
  }
}
