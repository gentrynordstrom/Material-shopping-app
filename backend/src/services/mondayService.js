const fetch = require('node-fetch');
const config = require('../config');

const MONDAY_API_URL = config.mondayApiUrl;

async function mondayQuery(query, variables = {}) {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: config.mondayApiToken,
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error('Monday.com API errors:', JSON.stringify(json.errors, null, 2));
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

let cachedSubitemBoardId = null;

async function discoverSubitemBoardId() {
  if (cachedSubitemBoardId) return cachedSubitemBoardId;

  const query = `query {
    boards(ids: [${config.boardId}]) {
      columns {
        id
        title
        type
        settings_str
      }
      items_page(limit: 1) {
        items {
          subitems {
            board { id }
          }
        }
      }
    }
  }`;

  const data = await mondayQuery(query);
  const board = data.boards[0];

  const items = board.items_page.items;
  for (const item of items) {
    if (item.subitems && item.subitems.length > 0) {
      cachedSubitemBoardId = item.subitems[0].board.id;
      console.log(`Discovered subitem board ID: ${cachedSubitemBoardId}`);
      return cachedSubitemBoardId;
    }
  }

  throw new Error('Could not discover subitem board ID. Ensure at least one item has subitems.');
}

async function getSubitemBoardColumns() {
  const subitemBoardId = await discoverSubitemBoardId();
  const query = `query {
    boards(ids: [${subitemBoardId}]) {
      columns {
        id
        title
        type
        settings_str
      }
    }
  }`;

  const data = await mondayQuery(query);
  return data.boards[0].columns;
}

async function getGroups() {
  const query = `query {
    boards(ids: [${config.boardId}]) {
      groups {
        id
        title
      }
    }
  }`;
  const data = await mondayQuery(query);
  return data.boards[0].groups;
}

async function getTurnovers() {
  const groups = await getGroups();
  const activeGroup = groups.find(
    (g) => g.title.toLowerCase() === config.activeGroupName.toLowerCase()
  );

  if (!activeGroup) {
    console.warn(`Group "${config.activeGroupName}" not found. Available groups:`,
      groups.map((g) => g.title));
    throw new Error(`Group "${config.activeGroupName}" not found on this board.`);
  }

  const query = `query {
    boards(ids: [${config.boardId}]) {
      groups(ids: ["${activeGroup.id}"]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
              type
            }
            subitems {
              id
            }
          }
        }
      }
    }
  }`;

  const data = await mondayQuery(query);
  const items = data.boards[0].groups[0].items_page.items;

  return items.map((item) => {
    const statusCol = item.column_values.find(
      (c) => c.type === 'color' || c.id === 'status'
    );
    return {
      id: item.id,
      name: item.name,
      status: statusCol ? statusCol.text : '',
      subitemCount: item.subitems ? item.subitems.length : 0,
      columnValues: item.column_values,
    };
  });
}

async function getMaterials(turnoverItemId) {
  const query = `query {
    items(ids: [${turnoverItemId}]) {
      name
      subitems {
        id
        name
        column_values {
          id
          text
          value
          type
        }
      }
    }
  }`;

  const data = await mondayQuery(query);
  const parentItem = data.items[0];

  if (!parentItem || !parentItem.subitems) return [];

  const materials = parentItem.subitems.filter((sub) => {
    const itemTypeCol = sub.column_values.find(
      (c) => c.id === config.columns.itemTypeId
    );
    if (!itemTypeCol) return false;
    const text = itemTypeCol.text || '';
    return text.toLowerCase() === config.columns.materialValue.toLowerCase();
  });

  return materials.map((sub) => {
    const colMap = {};
    sub.column_values.forEach((c) => {
      colMap[c.id] = { text: c.text, value: c.value, type: c.type };
    });

    return {
      id: sub.id,
      name: sub.name,
      itemType: colMap[config.columns.itemTypeId]?.text || '',
      columnValues: colMap,
      allColumns: sub.column_values,
      searchUrls: {
        homedepot: config.stores.homedepot.searchUrl(sub.name),
        menards: config.stores.menards.searchUrl(sub.name),
      },
    };
  });
}

async function updateSubitemColumn(subitemId, columnId, value) {
  const query = `mutation {
    change_simple_column_value(
      item_id: ${subitemId},
      board_id: ${await discoverSubitemBoardId()},
      column_id: "${columnId}",
      value: "${value}"
    ) {
      id
    }
  }`;

  return mondayQuery(query);
}

async function ensurePriceColumns() {
  const subitemBoardId = await discoverSubitemBoardId();
  const columns = await getSubitemBoardColumns();
  const existingIds = columns.map((c) => c.id);

  const needed = [
    { id: 'menards_price', title: 'Menards Price', type: 'numbers' },
    { id: 'hd_price', title: 'Home Depot Price', type: 'numbers' },
    { id: 'menards_url', title: 'Menards URL', type: 'link' },
    { id: 'hd_url', title: 'Home Depot URL', type: 'link' },
    { id: 'selected_vendor', title: 'Selected Vendor', type: 'text' },
  ];

  const created = [];
  for (const col of needed) {
    if (!existingIds.includes(col.id)) {
      try {
        const query = `mutation {
          create_column(
            board_id: ${subitemBoardId},
            title: "${col.title}",
            column_type: ${col.type},
            id: "${col.id}"
          ) {
            id
            title
          }
        }`;
        const data = await mondayQuery(query);
        created.push(data.create_column);
      } catch (err) {
        console.warn(`Column "${col.title}" may already exist: ${err.message}`);
      }
    }
  }

  return { existing: existingIds, created };
}

async function savePrice(subitemId, store, price, productUrl) {
  const subitemBoardId = await discoverSubitemBoardId();
  const priceColId = store === 'menards' ? 'menards_price' : 'hd_price';
  const urlColId = store === 'menards' ? 'menards_url' : 'hd_url';

  const priceValue = JSON.stringify(JSON.stringify({ [priceColId]: price.toString() }));
  const priceQuery = `mutation {
    change_multiple_column_values(
      item_id: ${subitemId},
      board_id: ${subitemBoardId},
      column_values: ${priceValue}
    ) {
      id
    }
  }`;
  await mondayQuery(priceQuery);

  if (productUrl) {
    const urlValue = JSON.stringify(
      JSON.stringify({ [urlColId]: { url: productUrl, text: store === 'menards' ? 'Menards' : 'Home Depot' } })
    );
    const urlQuery = `mutation {
      change_multiple_column_values(
        item_id: ${subitemId},
        board_id: ${subitemBoardId},
        column_values: ${urlValue}
      ) {
        id
      }
    }`;
    await mondayQuery(urlQuery);
  }

  return { success: true };
}

async function saveProduct(subitemId, product) {
  const subitemBoardId = await discoverSubitemBoardId();
  const { store, price, url, name, sku } = product;
  const priceColId = store === 'menards' ? 'menards_price' : 'hd_price';
  const urlColId = store === 'menards' ? 'menards_url' : 'hd_url';

  const colValues = { [priceColId]: price.toString() };

  if (url) {
    colValues[urlColId] = {
      url,
      text: name || (store === 'menards' ? 'Menards' : 'Home Depot'),
    };
  }

  const value = JSON.stringify(JSON.stringify(colValues));
  const query = `mutation {
    change_multiple_column_values(
      item_id: ${subitemId},
      board_id: ${subitemBoardId},
      column_values: ${value}
    ) {
      id
    }
  }`;
  await mondayQuery(query);

  return { success: true };
}

module.exports = {
  discoverSubitemBoardId,
  getSubitemBoardColumns,
  getGroups,
  getTurnovers,
  getMaterials,
  updateSubitemColumn,
  ensurePriceColumns,
  savePrice,
  saveProduct,
};
