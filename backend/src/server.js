const express = require('express');
const cors = require('cors');
const config = require('./config');

const turnoversRouter = require('./routes/turnovers');
const materialsRouter = require('./routes/materials');
const boardRouter = require('./routes/board');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/turnovers', turnoversRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/board', boardRouter);

app.get('/api/stores', (req, res) => {
  res.json({
    homedepot: {
      name: config.stores.homedepot.name,
      storeId: config.stores.homedepot.storeId,
      location: config.stores.homedepot.location,
    },
    menards: {
      name: config.stores.menards.name,
      location: config.stores.menards.location,
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Material Shopping API running on port ${config.port}`);
});
