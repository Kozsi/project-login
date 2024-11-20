const path = require('path');

module.exports = {
  entry: './src/app.js', // Your main JS file
  output: {
    path: path.resolve(__dirname, 'public/js'), // Output folder
    filename: 'bundle.js', // Output file
  },
  mode: 'production', // Set to 'production' for optimized build
};
