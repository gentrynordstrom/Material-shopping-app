require('dotenv').config();

module.exports = {
  mondayApiToken: process.env.MONDAY_API_TOKEN,
  boardId: process.env.BOARD_ID || '7288152041',
  port: process.env.PORT || 3001,
  mondayApiUrl: 'https://api.monday.com/v2',
  databaseUrl: process.env.DATABASE_URL,

  stores: {
    homedepot: {
      name: 'Home Depot',
      storeId: '1977',
      location: 'Peru, IL',
      searchUrl: (query) =>
        `https://www.homedepot.com/s/${encodeURIComponent(query)}?store=1977`,
    },
    menards: {
      name: 'Menards',
      location: 'Peru, IL',
      searchUrl: (query) =>
        `https://www.menards.com/main/search.html?search=${encodeURIComponent(query)}`,
    },
  },

  activeGroupName: process.env.ACTIVE_GROUP_NAME || 'Active Turns',

  columns: {
    itemTypeId: 'dropdown_mkw5qbj',
    materialValue: 'Material',
  },
};
