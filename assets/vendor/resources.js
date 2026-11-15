// Serve React from this site instead of unpkg. Files are byte-identical to the runtime's pinned
// versions (sha384 matches REACT_SRI / REACT_DOM_SRI in support.js). React is MIT-licensed.
window.__resources = {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js': 'assets/vendor/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': 'assets/vendor/react-dom.production.min.js'
};
