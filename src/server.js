require('dotenv').config();

const express = require('express');
const app = express();

const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_KEY });

app.use(express.json());

// make a query to the database that returns all the entries references
app.get('/v1/api/recetas/databases/:databaseId', async (req, res) => {
  const { databaseId } = req.params;
  try {
    const response = await notion.databases.query({ database_id: databaseId });
    const results = response['results'];

    const entries = results.map((entry) => {
      return {
        id: entry.id.replace("-", ""),
        created_time: entry.created_time,
        name: entry.properties.Nombre.title[0].plain_text,
        tags_name: entry.properties.Etiqueta.multi_select.map((tag) => ({
          name: tag.name,
          color: tag.color,
        })),
      };
    });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'error', error });
  }
});

// make a query to get back a specific page by its id
app.get('/v1/api/recetas/paginas/:pageId', async (req, res) => {
  const { pageId } = req.params;
  try {
    const response = await notion.pages.retrieve({ page_id: pageId });
    console.log(response);

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'error', error });
  }
});

// make a query to get back the content of a specific page by its id
app.get('/v1/api/recetas/paginas/contenido/:pageId', async (req, res) => {
  const { pageId } = req.params;
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 50,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'error', error });
  }
});

//create an entry in the database
app.post('/v1/api/recetas', async function (request, response) {
  const { dbID, pageName, tag, content } = request.body;
  const { ingredients, steps, details } = content;

  /*
  TODO: content must be an array of objects with the following structure:
  [
  ingredients: [
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: "ingredient 1"
              }
            }
          ]
        }
      },
      ...
    ],
      steps: [
      {
        object: 'block',
        type: 'numbered_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: "step"
              }
            }
          ]
        }
      },
      ...
    ],
        details: [
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: [
              {
                text: {
                  content: details,
                },
              },
            ],
          },
        ],
  ]
  */

  try {
    const newPage = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: dbID,
      },
      icon: {
        type: 'emoji',
        emoji: '🍨',
      },
      // properties of the entry (columns in the database)
      properties: {
        Name: {
          title: [
            {
              text: {
                content: pageName,
              },
            },
          ],
        },
        Tags: {
          multi_select: [
            {
              name: tag,
            },
          ],
        },
      },
      // content inside the entry (ingridients, steps, etc.)
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                text: {
                  content: 'Ingredientes',
                },
              },
            ],
          },
        },
        ingredients,
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                text: {
                  content: 'Pasos',
                },
              },
            ],
          },
        },
        steps,
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                text: {
                  content: 'Detalles',
                },
              },
            ],
          },
        },
        details,
      ],
    });
    response.status(201).json({ message: 'success!', data: newPage });
  } catch (error) {
    response.status(500).json({ message: 'error', error });
  }
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
