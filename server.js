const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve the docs/ folder — same files GitHub Pages will serve
app.use(express.static(path.join(__dirname, 'docs')));

// product.html route (so /product?id=xxx works locally without .html)
app.get('/product', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'product.html'));
});

app.listen(PORT, () => {
  console.log(`\n  crochetbysailee running at http://localhost:${PORT}\n`);
});
