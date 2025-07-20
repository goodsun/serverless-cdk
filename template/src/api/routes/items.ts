import { Router } from 'express';
import { DynamoDBService } from '../services/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const itemsRouter = Router();
const db = new DynamoDBService();

// GET /api/items - List all items
itemsRouter.get('/', async (req, res, next) => {
  try {
    const { type = 'item' } = req.query;
    const items = await db.queryItems(type as string);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

// GET /api/items/:id - Get single item
itemsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await db.getItem(id);
    
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

// POST /api/items - Create new item
itemsRouter.post('/', async (req, res, next) => {
  try {
    const { name, description, type = 'item', metadata = {} } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    
    const item = {
      id: uuidv4(),
      name,
      description,
      type,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await db.createItem(item);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/items/:id - Update item
itemsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, metadata } = req.body;
    
    const existingItem = await db.getItem(id);
    if (!existingItem) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    
    const updatedItem = {
      ...existingItem,
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(metadata !== undefined && { metadata }),
      updatedAt: new Date().toISOString(),
    };
    
    await db.updateItem(updatedItem);
    res.json({ item: updatedItem });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/items/:id - Delete item
itemsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existingItem = await db.getItem(id);
    if (!existingItem) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    
    await db.deleteItem(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});