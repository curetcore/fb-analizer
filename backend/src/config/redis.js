const redis = require('redis');
const logger = require('../utils/logger');

let client;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    client.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    await client.connect();
  } catch (error) {
    logger.error('Redis connection error:', error);
    // Don't throw - app can work without Redis cache
  }
};

const get = async (key) => {
  if (!client?.isOpen) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

const set = async (key, value, expiresIn = 900) => { // 15 minutes default
  if (!client?.isOpen) return false;
  try {
    await client.setEx(key, expiresIn, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
};

const del = async (key) => {
  if (!client?.isOpen) return false;
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis delete error:', error);
    return false;
  }
};

const flush = async () => {
  if (!client?.isOpen) return false;
  try {
    await client.flushAll();
    return true;
  } catch (error) {
    logger.error('Redis flush error:', error);
    return false;
  }
};

module.exports = {
  connectRedis,
  get,
  set,
  del,
  flush,
  client
};